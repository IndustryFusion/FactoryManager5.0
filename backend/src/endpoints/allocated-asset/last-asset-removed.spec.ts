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
import axios from 'axios';
import { HttpException } from '@nestjs/common';
import { AllocatedAssetService } from './allocated-asset.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const FACTORY = 'urn:ifric:ifx-eur-loc-fac-1';
const STORE = `${FACTORY}:allocated-assets`;

/** A flow with these asset nodes, as the react-flow document holds them. */
const flowWith = (assetIds: string[]) => ({
  findOne: jest.fn().mockResolvedValue({
    factoryData: { nodes: assetIds.map((id) => ({ id: `asset_${id}` })) },
  }),
});

/** The factory's own list, as this application now holds it. */
const holders = () => {
  const lists = new Map<string, string[]>();
  return {
    lists,
    getFactoryAllocatedAssets: jest.fn(async (factoryId: string) => lists.get(factoryId) ?? []),
    setFactoryAllocatedAssets: jest.fn(async (factoryId: string, assets: string[]) => {
      lists.set(factoryId, assets);
      return assets;
    }),
    deleteFactoryAllocatedAssets: jest.fn(async (factoryId: string) => lists.delete(factoryId)),
    listFactoryAllocatedAssets: jest.fn(async () =>
      [...lists.entries()].map(([factoryId, assets]) => ({ factoryId, assets })),
    ),
    getGlobalAllocatedAssets: jest.fn().mockResolvedValue([]),
    setGlobalAllocatedAssets: jest.fn(async (assets: string[]) => assets),
  };
};

const service = (assetIds: string[], store = holders()) => ({
  store,
  service: new AllocatedAssetService(
    { getAssetDataById: jest.fn().mockResolvedValue({}) } as any,
    flowWith(assetIds) as any,
    { findAll: jest.fn().mockResolvedValue([]) } as any,
    store as any,
  ),
});

describe('removing the last asset from a factory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SCORPIO_URL = 'http://scorpio.test/entities';
    mockedAxios.get.mockResolvedValue({ data: [] } as any);
  });

  it('answers with a status instead of nothing', async () => {
    // The defect: "nothing to allocate" matched no success check, so update()
    // returned undefined and the controller answered 500 — with the factory's
    // list already deleted.
    const { service: allocated } = service([]);

    const result = await allocated.update(FACTORY, 'token');

    expect(result).toBeDefined();
    expect(result.status).toBe(200);
  });

  it("forgets the factory's list when nothing is allocated any more", async () => {
    const { service: allocated, store } = service([]);
    store.lists.set(FACTORY, ['urn:asset:gone']);

    await allocated.update(FACTORY, 'token');

    expect(store.deleteFactoryAllocatedAssets).toHaveBeenCalledWith(FACTORY);
    expect(store.lists.has(FACTORY)).toBe(false);
  });

  it('does not fail when that factory had no list at all', async () => {
    const { service: allocated } = service([]);

    await expect(allocated.update(FACTORY, 'token')).resolves.toMatchObject({ status: 200 });
  });

  it('writes the list in one go when assets remain', async () => {
    const { service: allocated, store } = service(['urn:asset:a']);

    const result = await allocated.update(FACTORY, 'token');

    expect(result.status).toBe(200);
    expect(store.setFactoryAllocatedAssets).toHaveBeenCalledWith(FACTORY, ['urn:asset:a']);
    // Nothing is deleted on the way: the list is replaced, never emptied first.
    expect(store.deleteFactoryAllocatedAssets).not.toHaveBeenCalled();
  });

  it('still reports a real failure', async () => {
    const store = holders();
    store.setFactoryAllocatedAssets.mockRejectedValue(new Error('mongo down'));
    const { service: allocated } = service(['urn:asset:a'], store);

    await expect(allocated.update(FACTORY, 'token')).rejects.toBeInstanceOf(HttpException);
  });
});
