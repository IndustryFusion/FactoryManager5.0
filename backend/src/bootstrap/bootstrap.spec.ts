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

import axios from 'axios';
import { Logger } from '@nestjs/common';
import { UrnHoldersBootstrap } from './urn-holders.bootstrap';
import { PdtViewsBootstrap } from './pdt-views.bootstrap';
import { PDT_VIEW_STATEMENTS } from './pdt-views.sql';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const queries: string[] = [];
/** Views the fake database reports as existing, and who owns them. */
let existingViews: Array<{ viewname: string; viewowner: string }> = [];
let currentUser = 'factory_admin';

const client = {
  connect: jest.fn(),
  query: jest.fn(async (sql: string) => {
    if (sql.includes('current_user')) return { rows: [{ me: currentUser }] };
    if (sql.includes('pg_views')) return { rows: existingViews };
    queries.push(sql);
    return { rows: [] };
  }),
  end: jest.fn(async () => undefined),
};
jest.mock('pg', () => ({ Client: jest.fn(() => client) }));

/**
 * These run while the service is starting, so the behaviour that matters most
 * is what happens when the thing they provision is unreachable: starting must
 * still succeed.
 */

const tokenService = { getToken: async () => 'service-token' } as any;

/** A stand-in for the Mongo-backed holders, recording what was seeded. */
const holderStore = () => {
  const seeded = new Map<string, any>();
  return {
    seeded,
    has: async (key: string) => seeded.has(key),
    seedIfAbsent: async (key: string, values: any) => {
      if (seeded.has(key)) return false;
      seeded.set(key, values);
      return true;
    },
  } as any;
};

describe('UrnHoldersBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SCORPIO_URL = 'http://scorpio.test/entities';
    delete process.env.FACTORY_AUTO_PROVISION;
  });

  it('carries the count over from the Scorpio holder', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('shopFloor-id-store')) {
        return { data: { 'last-urn': { value: 'urn:ngsi-ld:shopFloors:2:007' } } } as any;
      }
      throw { response: { status: 404 } };
    });
    const holders = holderStore();

    await new UrnHoldersBootstrap(tokenService, holders).onModuleInit();

    expect(holders.seeded.get('shop-floor-counter')).toEqual({ lastNumber: 7, width: 3 });
    expect(holders.seeded.get('global-allocated-assets')).toEqual({ assets: [] });
  });

  it('falls back to the highest shop floor that exists', async () => {
    // The holder is gone but the floors are not. Starting from zero here
    // would mint ids that are already taken.
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('id-store') || url.includes('global-allocated')) {
        throw { response: { status: 404 } };
      }
      return {
        data: [
          { id: 'urn:ngsi-ld:shopFloors:2:004' },
          { id: 'urn:ngsi-ld:shopFloors:2:011' },
          { id: 'urn:ngsi-ld:not-a-shop-floor' },
        ],
      } as any;
    });
    const holders = holderStore();

    await new UrnHoldersBootstrap(tokenService, holders).onModuleInit();

    expect(holders.seeded.get('shop-floor-counter').lastNumber).toBe(11);
  });

  it('starts at zero on an empty installation', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('store')) throw { response: { status: 404 } };
      return { data: [] } as any;
    });
    const holders = holderStore();

    await new UrnHoldersBootstrap(tokenService, holders).onModuleInit();

    expect(holders.seeded.get('shop-floor-counter').lastNumber).toBe(0);
  });

  it('leaves holders that already exist alone', async () => {
    const holders = holderStore();
    holders.seeded.set('shop-floor-counter', { lastNumber: 42, width: 3 });
    holders.seeded.set('global-allocated-assets', { assets: ['a'] });

    await new UrnHoldersBootstrap(tokenService, holders).onModuleInit();

    expect(holders.seeded.get('shop-floor-counter').lastNumber).toBe(42);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('seeds nothing, rather than a colliding counter, when Scorpio cannot be read', async () => {
    mockedAxios.get.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const holders = holderStore();

    // Still starts: a boot-time outage must not stop the service.
    await expect(
      new UrnHoldersBootstrap(tokenService, holders).onModuleInit(),
    ).resolves.toBeUndefined();
    expect(holders.seeded.size).toBe(0);
  });

  it('can be switched off', async () => {
    process.env.FACTORY_AUTO_PROVISION = 'false';
    const holders = holderStore();

    await new UrnHoldersBootstrap(tokenService, holders).onModuleInit();

    expect(holders.seeded.size).toBe(0);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});

describe('PdtViewsBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queries.length = 0;
    existingViews = [];
    currentUser = 'factory_admin';
    delete process.env.FACTORY_AUTO_PROVISION;
    process.env.PDT_DB_HOST = 'pdt-db.test';
    process.env.PDT_DB_USER = 'ngb';
    process.env.PDT_DB_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.PDT_DB_HOST;
  });

  it('applies every statement from the README', async () => {
    await new PdtViewsBootstrap().onModuleInit();

    expect(queries).toHaveLength(PDT_VIEW_STATEMENTS.length);
    expect(queries.filter((q) => q.startsWith('CREATE OR REPLACE VIEW'))).toHaveLength(6);
    expect(queries.filter((q) => q.startsWith('GRANT SELECT'))).toHaveLength(6);
  });

  it('creates the role only when it is missing', async () => {
    await new PdtViewsBootstrap().onModuleInit();

    // The README's bare CREATE ROLE fails once the role exists, which would
    // break every restart after the first.
    const role = queries.find((q) => q.includes('CREATE ROLE'));
    expect(role).toContain('IF NOT EXISTS');
    expect(role).toContain('pg_roles');
  });

  it('leaves views owned by someone else alone, without calling them failures', async () => {
    // What a real installation looks like: the views were created by hand
    // from the README, so they belong to ngb and cannot be replaced or
    // granted on by this connection. That is healthy, not an error.
    existingViews = [
      { viewname: 'value_change_state_entries', viewowner: 'ngb' },
      { viewname: 'power_emission_entries_days', viewowner: 'ngb' },
      { viewname: 'power_emission_entries_weeks', viewowner: 'ngb' },
      { viewname: 'power_emission_entries_months', viewowner: 'ngb' },
      { viewname: 'machine_state_daily_stats', viewowner: 'ngb' },
      { viewname: 'machine_state_2h_stats', viewowner: 'ngb' },
    ];
    const errors = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await new PdtViewsBootstrap().onModuleInit();

    // Only the role statement is attempted; the twelve view ones are skipped.
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('CREATE ROLE');
    expect(errors).not.toHaveBeenCalled();
  });

  it('still creates a view that is missing', async () => {
    existingViews = [{ viewname: 'value_change_state_entries', viewowner: 'ngb' }];

    await new PdtViewsBootstrap().onModuleInit();

    // The one owned elsewhere is skipped along with its grant; the rest run.
    expect(queries).toHaveLength(PDT_VIEW_STATEMENTS.length - 2);
  });

  it('replaces views it owns itself', async () => {
    existingViews = [{ viewname: 'value_change_state_entries', viewowner: 'factory_admin' }];

    await new PdtViewsBootstrap().onModuleInit();

    expect(queries).toHaveLength(PDT_VIEW_STATEMENTS.length);
  });

  it('carries on when one statement fails', async () => {
    // Fails the first view only - not the probes, which run before any of
    // the statements and whose failure is a different path.
    let failed = false;
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('current_user')) return { rows: [{ me: currentUser }] };
      if (sql.includes('pg_views')) return { rows: existingViews };
      if (!failed && sql.startsWith('CREATE OR REPLACE VIEW')) {
        failed = true;
        throw new Error('permission denied');
      }
      queries.push(sql);
      return { rows: [] };
    });

    await expect(new PdtViewsBootstrap().onModuleInit()).resolves.toBeUndefined();

    // The other twelve still ran.
    expect(queries).toHaveLength(PDT_VIEW_STATEMENTS.length - 1);
  });

  it('starts the service even when the database is unreachable', async () => {
    client.connect.mockRejectedValueOnce(new Error('connect ETIMEDOUT'));

    await expect(new PdtViewsBootstrap().onModuleInit()).resolves.toBeUndefined();
  });

  it('does nothing when no database is configured', async () => {
    delete process.env.PDT_DB_HOST;

    await new PdtViewsBootstrap().onModuleInit();

    expect(client.connect).not.toHaveBeenCalled();
  });

  it('can be switched off', async () => {
    process.env.FACTORY_AUTO_PROVISION = 'false';

    await new PdtViewsBootstrap().onModuleInit();

    expect(client.connect).not.toHaveBeenCalled();
  });
});
