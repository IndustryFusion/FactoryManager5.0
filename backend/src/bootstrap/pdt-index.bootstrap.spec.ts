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
import { Logger } from '@nestjs/common';
import { PdtIndexBootstrap } from './pdt-index.bootstrap';

/** What the fake database holds. */
const db = {
  me: 'ngb',
  tableOwner: 'ngb' as string | null,
  index: null as null | { valid: boolean },
  hypertable: true,
  lockFree: true,
};
const ddl: string[] = [];

const client = {
  connect: jest.fn(async () => undefined),
  end: jest.fn(async () => undefined),
  query: jest.fn(async (sql: string) => {
    if (sql.includes('current_user')) return { rows: [{ me: db.me }] };
    if (sql.includes('pg_tables')) return { rows: db.tableOwner ? [{ tableowner: db.tableOwner }] : [] };
    if (sql.includes('pg_index')) return { rows: db.index ? [db.index] : [] };
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ got: db.lockFree }] };
    if (sql.includes('_timescaledb_catalog')) {
      if (db.hypertable === null) throw new Error('schema "_timescaledb_catalog" does not exist');
      return { rows: db.hypertable ? [{ '?column?': 1 }] : [] };
    }
    ddl.push(sql);
    return { rows: [] };
  }),
};
jest.mock('pg', () => ({ Client: jest.fn(() => client) }));

const start = async () => {
  const bootstrap = new PdtIndexBootstrap();
  bootstrap.onModuleInit();
  await bootstrap.done;
};

describe('PdtIndexBootstrap', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    ddl.length = 0;
    Object.assign(db, { me: 'ngb', tableOwner: 'ngb', index: null, hypertable: true, lockFree: true });
    process.env.PDT_DB_HOST = 'pdt-db.test';
    delete process.env.FACTORY_AUTO_PROVISION;
    delete process.env.PDT_DB_INDEXES;
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    delete process.env.PDT_DB_HOST;
    jest.restoreAllMocks();
  });

  it('does not hold up startup: the build runs in the background', () => {
    const bootstrap = new PdtIndexBootstrap();
    expect(bootstrap.onModuleInit()).toBeUndefined();
    return bootstrap.done;
  });

  it('builds it a chunk at a time on a hypertable, so the PDT keeps writing', async () => {
    await start();
    expect(ddl).toHaveLength(1);
    expect(ddl[0]).toContain('CREATE INDEX IF NOT EXISTS attributes_entity_attribute_time');
    expect(ddl[0]).toContain('timescaledb.transaction_per_chunk');
    expect(ddl[0]).not.toContain('CONCURRENTLY');
  });

  it('builds it concurrently on a plain table', async () => {
    db.hypertable = false;
    await start();
    expect(ddl[0]).toContain('CREATE INDEX CONCURRENTLY IF NOT EXISTS');
  });

  it('treats a database without TimescaleDB as a plain table', async () => {
    db.hypertable = null as unknown as boolean;
    await start();
    expect(ddl[0]).toContain('CONCURRENTLY');
  });

  it('only checks once the index exists', async () => {
    db.index = { valid: true };
    await start();
    expect(ddl).toHaveLength(0);
    expect(error).not.toHaveBeenCalled();
  });

  it('leaves an invalid index to its owner, with what to do', async () => {
    db.index = { valid: false };
    await start();
    expect(ddl).toHaveLength(0);
    expect(warn.mock.calls[0][0]).toContain('DROP INDEX attributes_entity_attribute_time');
  });

  it('gives the statement to run by hand when another user owns the table', async () => {
    db.tableOwner = 'postgres';
    await start();
    expect(ddl).toHaveLength(0);
    expect(log.mock.calls.map((c) => c[0]).join('\n')).toContain('CREATE INDEX IF NOT EXISTS attributes_entity_attribute_time');
    expect(error).not.toHaveBeenCalled();
  });

  it('lets one instance build it when several start together', async () => {
    db.lockFree = false;
    await start();
    expect(ddl).toHaveLength(0);
  });

  it('never fails startup, even when the build fails', async () => {
    client.connect.mockRejectedValueOnce(new Error('connect ETIMEDOUT'));
    await expect(start()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    expect(client.end).toHaveBeenCalled();
  });

  it('does nothing without a database, or when switched off', async () => {
    delete process.env.PDT_DB_HOST;
    await start();
    process.env.PDT_DB_HOST = 'pdt-db.test';
    process.env.PDT_DB_INDEXES = 'false';
    await start();
    process.env.PDT_DB_INDEXES = 'true';
    process.env.FACTORY_AUTO_PROVISION = 'false';
    await start();
    expect(client.connect).not.toHaveBeenCalled();
  });
});
