//
// Copyright (c) 2026 IB Systems GmbH
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
import { ATTRIBUTE_INDEX } from './pdt-views.sql';

// Any number, as long as it is always this one: it is what stops two
// instances starting together from building the same index twice.
const ADVISORY_LOCK = 742001;

/**
 * Creates ATTRIBUTE_INDEX on the PDT's `attributes` table, next to the views
 * PdtViewsBootstrap creates, with the same PDT_DB_* connection.
 *
 * Unlike the views it can take minutes on a large table, so it is built in the
 * background on its own connection with no statement timeout, and startup does
 * not wait for it. It is only attempted when this connection owns the table;
 * otherwise the log gives the statement to run by hand. Once the index exists
 * a restart only checks for it.
 *
 * Off with FACTORY_AUTO_PROVISION=false (like the views) or PDT_DB_INDEXES=false.
 */
@Injectable()
export class PdtIndexBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PdtIndexBootstrap.name);
  /** The background build, so a test (or anything else) can wait for it. */
  done: Promise<void> = Promise.resolve();

  onModuleInit(): void {
    if (process.env.FACTORY_AUTO_PROVISION === 'false' || process.env.PDT_DB_INDEXES === 'false') return;
    if (!process.env.PDT_DB_HOST) return;
    this.done = this.ensureIndex();
  }

  private async ensureIndex(): Promise<void> {
    const client = new Client({
      host: process.env.PDT_DB_HOST,
      port: Number(process.env.PDT_DB_PORT ?? 5432),
      database: process.env.PDT_DB_NAME ?? 'tsdb',
      user: process.env.PDT_DB_USER,
      password: process.env.PDT_DB_PASSWORD,
      ssl: process.env.PDT_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: Number(process.env.PDT_DB_TIMEOUT_MS ?? 10_000),
      // No statement timeout: building the index is allowed to take as long as it takes.
      statement_timeout: 0,
    });
    const manual = `Run this once as the owner of "attributes":\n${ATTRIBUTE_INDEX.onHypertable};`;

    try {
      await client.connect();
      const { rows: [{ me }] } = await client.query('SELECT current_user AS me');
      const { rows: [table] } = await client.query(
        `SELECT tableowner FROM pg_tables WHERE tablename = 'attributes' AND schemaname = current_schema()`,
      );
      if (!table) {
        this.logger.warn('There is no "attributes" table in the PDT database, so its index was not created.');
        return;
      }

      const { rows: [index] } = await client.query(
        'SELECT i.indisvalid AS valid FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid WHERE c.relname = $1',
        [ATTRIBUTE_INDEX.name],
      );
      if (index?.valid) {
        this.logger.log(`Index ${ATTRIBUTE_INDEX.name} is in place.`);
        return;
      }
      if (index) {
        // An interrupted build leaves an invalid index behind, which IF NOT
        // EXISTS would keep forever. Dropping it is the owner's call.
        this.logger.warn(
          `Index ${ATTRIBUTE_INDEX.name} exists but is not valid (an earlier build was interrupted). ` +
            `Drop it (DROP INDEX ${ATTRIBUTE_INDEX.name};) and restart this service to build it again.`,
        );
        return;
      }
      if (table.tableowner !== me) {
        this.logger.log(
          `Index ${ATTRIBUTE_INDEX.name} is missing, and "attributes" is owned by ${table.tableowner}, not ${me}, ` +
            `so it cannot be created from here. The Data Viewer works without it, more slowly on large installations. ${manual}`,
        );
        return;
      }

      const { rows: [lock] } = await client.query('SELECT pg_try_advisory_lock($1) AS got', [ADVISORY_LOCK]);
      if (!lock?.got) {
        this.logger.log(`Another instance is building index ${ATTRIBUTE_INDEX.name}.`);
        return;
      }

      const hypertable = await client
        .query(`SELECT 1 FROM _timescaledb_catalog.hypertable WHERE table_name = 'attributes'`)
        .then((r) => r.rows.length > 0)
        .catch(() => false);
      const started = Date.now();
      this.logger.log(`Building index ${ATTRIBUTE_INDEX.name} on "attributes" in the background${hypertable ? ', one chunk at a time' : ''}…`);
      await client.query(hypertable ? ATTRIBUTE_INDEX.onHypertable : ATTRIBUTE_INDEX.onTable);
      this.logger.log(`Index ${ATTRIBUTE_INDEX.name} built in ${Math.round((Date.now() - started) / 1000)} s.`);
    } catch (err) {
      // Never fatal: the Data Viewer works without the index, only slower.
      this.logger.error(`Could not create index ${ATTRIBUTE_INDEX.name}: ${err?.message ?? err}. ${manual}`);
    } finally {
      // Ending the session also releases the advisory lock.
      await client.end().catch(() => undefined);
    }
  }
}
