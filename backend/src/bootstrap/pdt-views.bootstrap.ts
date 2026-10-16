//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { DEFAULT_PGREST_ROLE, pdtViewStatements } from './pdt-views.sql';

/**
 * Creates the dashboard views in the PDT database, and the role PostgREST
 * reads them as.
 *
 * The README asked an operator to kubectl into the acid-cluster pod and paste
 * these in by hand after every deployment. Missing that step leaves the data
 * dashboards empty with no obvious cause, so it is done here instead.
 *
 * This is the only place in this application that speaks SQL. Everything else
 * reads the same data through PostgREST, which cannot run DDL — hence a
 * direct connection, configured entirely from the environment.
 *
 * The role is PDT_PGREST_ROLE, or pgrest as the README has it. The role and
 * its grants are only attempted when they can work: not when PostgREST reads
 * as this connection's own user, which owns the views it creates and needs no
 * grant (the DigitalTwin case: dbreader), and not when the role is missing and
 * this user may not create roles (dbreader is NOCREATEROLE), which is said
 * once with what to do rather than as a failure per statement.
 *
 * Inert unless PDT_DB_HOST is set: an installation that has not been given a
 * connection keeps the manual arrangement and is not nagged about it.
 */
@Injectable()
export class PdtViewsBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PdtViewsBootstrap.name);

  /** The view a statement acts on, or undefined for the role. */
  private targetOf(label: string): string | undefined {
    if (label.startsWith('view ')) return label.slice('view '.length);
    if (label.startsWith('grant on ')) return label.slice('grant on '.length);
    return undefined;
  }

  /** The role statement and the grants, as opposed to the views. */
  private isForRole(label: string): boolean {
    return label.startsWith('role ') || label.startsWith('grant on ');
  }

  async onModuleInit(): Promise<void> {
    if (process.env.FACTORY_AUTO_PROVISION === 'false') {
      this.logger.log('View provisioning is switched off (FACTORY_AUTO_PROVISION=false).');
      return;
    }
    if (!process.env.PDT_DB_HOST) {
      this.logger.log(
        'PDT_DB_HOST is not set, so the dashboard views are not managed here. ' +
          'Create them as the README describes, or set the PDT_DB_* variables.',
      );
      return;
    }

    const client = new Client({
      host: process.env.PDT_DB_HOST,
      port: Number(process.env.PDT_DB_PORT ?? 5432),
      database: process.env.PDT_DB_NAME ?? 'tsdb',
      user: process.env.PDT_DB_USER,
      password: process.env.PDT_DB_PASSWORD,
      // In-cluster by default. Set PDT_DB_SSL=true if it ever is not.
      ssl: process.env.PDT_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      // Without this a database that accepts the connection but never answers
      // would hold up startup indefinitely.
      connectionTimeoutMillis: Number(process.env.PDT_DB_TIMEOUT_MS ?? 10_000),
      statement_timeout: Number(process.env.PDT_DB_TIMEOUT_MS ?? 10_000),
    });

    // Written into the SQL as it is, so nothing but a plain role name is used.
    const role = process.env.PDT_PGREST_ROLE || DEFAULT_PGREST_ROLE;
    const roleIsPlain = /^[a-z_][a-z0-9_]*$/.test(role);
    const statements = pdtViewStatements(
      roleIsPlain ? role : DEFAULT_PGREST_ROLE,
    );

    try {
      await client.connect();

      // Who this connection is, and whether the role can be granted to: it has
      // to exist already, or this user has to be allowed to create it.
      const { rows: probe } = await client.query(
        `SELECT current_user AS me,
       EXISTS (SELECT FROM pg_roles WHERE rolname = $1) AS role_exists,
       COALESCE((SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname = current_user), false) AS can_create_role`,
        [role],
      );
      const me = probe[0]?.me;
      const grantable = probe[0]?.role_exists || probe[0]?.can_create_role;
      const runRoleStatements = roleIsPlain && role !== me && grantable;

      if (!roleIsPlain) {
        this.logger.error(
          `PDT_PGREST_ROLE "${role}" is not a plain role name, so the dashboard views were ` +
            'not granted to anyone. Use lowercase letters, digits and underscores only.',
        );
      } else if (role !== me && !grantable) {
        this.logger.warn(
          `Role ${role} does not exist and ${me} may not create roles, so the dashboard views ` +
            `were not granted to it. If PostgREST reads them as ${role}, create it once as a ` +
            `superuser: CREATE ROLE ${role} NOLOGIN; If PostgREST reads them as ${me}, which owns ` +
            `them, set PDT_PGREST_ROLE=${me} and no grant is needed.`,
        );
      }

      // Which of these views already exist, and who owns them. An existing
      // view owned by someone else cannot be replaced or granted on, and that
      // is the normal case on an installation where they were created by hand
      // before this existed — so it is reported as "left alone", not as a
      // failure. Only an object we could have created and did not is an error.
      const { rows: existing } = await client.query(
        'SELECT viewname, viewowner FROM pg_views WHERE viewname = ANY($1)',
        [statements.map((s) => this.targetOf(s.label)).filter(Boolean)],
      );
      const ownerOf = new Map<string, string>(
        existing.map((r: any) => [r.viewname, r.viewowner]),
      );

      let applied = 0;
      let skipped = 0;
      for (const statement of statements) {
        if (!runRoleStatements && this.isForRole(statement.label)) continue;
        const target = this.targetOf(statement.label);
        const owner = target ? ownerOf.get(target) : undefined;
        if (owner && owner !== me) {
          skipped += 1;
          continue;
        }
        try {
          await client.query(statement.sql);
          applied += 1;
        } catch (err) {
          // One failure must not stop the rest: a partial result is more
          // useful than none.
          this.logger.error(`Could not apply ${statement.label}: ${err?.message ?? err}`);
        }
      }

      if (skipped > 0) {
        // Said once, at log level: this is a healthy installation whose views
        // predate this code, not something anyone needs to act on.
        const owners = [...new Set([...ownerOf.values()].filter((o) => o !== me))];
        this.logger.log(
          `${skipped} statement(s) left alone: those views already exist and are owned by ` +
            `${owners.join(', ')}, not ${me}. Nothing to do — they are in use as they are. ` +
            `To have this application manage them, connect as their owner.`,
        );
      }
      this.logger.log(
        `Dashboard views are up to date (${applied} applied, ${skipped} left alone).`,
      );
    } catch (err) {
      // Never fatal, for the same reason as everywhere else here: a database
      // that is unreachable at boot must not stop the service from starting.
      // The dashboards will be empty until this succeeds, which the log says.
      this.logger.error(
        `Could not reach the PDT database to create the dashboard views: ` +
          `${err?.message ?? err}. The data dashboards will have no data until this is resolved.`,
      );
    } finally {
      // end() on a client that never connected rejects; the outcome is the
      // same either way and the original error is the one worth reporting.
      await client.end().catch(() => undefined);
    }
  }
}
