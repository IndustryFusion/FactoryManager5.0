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
import { PDT_VIEW_STATEMENTS } from './pdt-views.sql';

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

    try {
      await client.connect();

      // Which of these views already exist, and who owns them. An existing
      // view owned by someone else cannot be replaced or granted on, and that
      // is the normal case on an installation where they were created by hand
      // before this existed — so it is reported as "left alone", not as a
      // failure. Only an object we could have created and did not is an error.
      const { rows: whoami } = await client.query('SELECT current_user AS me');
      const me = whoami[0]?.me;
      const { rows: existing } = await client.query(
        'SELECT viewname, viewowner FROM pg_views WHERE viewname = ANY($1)',
        [PDT_VIEW_STATEMENTS.map((s) => this.targetOf(s.label)).filter(Boolean)],
      );
      const ownerOf = new Map<string, string>(
        existing.map((r: any) => [r.viewname, r.viewowner]),
      );

      let applied = 0;
      let skipped = 0;
      for (const statement of PDT_VIEW_STATEMENTS) {
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
