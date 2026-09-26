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

const service = (assetIds: string[]) =>
  new AllocatedAssetService(
    { getAssetDataById: jest.fn().mockResolvedValue({}) } as any,
    flowWith(assetIds) as any,
    { findAll: jest.fn().mockResolvedValue([]) } as any,
    { setGlobalAllocatedAssets: jest.fn().mockResolvedValue([]),
      getGlobalAllocatedAssets: jest.fn().mockResolvedValue([]) } as any,
  );

describe('removing the last asset from a factory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SCORPIO_URL = 'http://scorpio.test/entities';
    // The global list is rebuilt from every factory's store; this company has
    // none besides the one under test.
    mockedAxios.get.mockResolvedValue({ data: [] } as any);
  });

  it('answers with a status instead of nothing', async () => {
    // The whole defect: create() reported "nothing to allocate", which matched
    // no success check, so update() returned undefined and the controller
    // answered 500 — with the store already deleted.
    mockedAxios.delete.mockResolvedValue({ status: 204 } as any);
    mockedAxios.post.mockResolvedValue({ status: 204, data: [] } as any);

    const result = await service([]).update(FACTORY, 'token');

    expect(result).toBeDefined();
    expect(result.status).toBe(200);
  });

  it('deletes the factory store when nothing is allocated any more', async () => {
    mockedAxios.delete.mockResolvedValue({ status: 204 } as any);
    mockedAxios.post.mockResolvedValue({ status: 204, data: [] } as any);

    await service([]).update(FACTORY, 'token');

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining(STORE),
      expect.anything(),
    );
  });

  it('does not fail when that store was never there', async () => {
    // A factory whose assets were never allocated: deleting nothing is fine.
    mockedAxios.delete.mockRejectedValue({ response: { status: 404 } });
    mockedAxios.post.mockResolvedValue({ status: 204, data: [] } as any);

    await expect(service([]).update(FACTORY, 'token')).resolves.toMatchObject({ status: 200 });
  });

  it('replaces the store rather than deleting it first when assets remain', async () => {
    mockedAxios.post.mockResolvedValue({ status: 204, statusText: 'No Content', data: [] } as any);

    const result = await service(['urn:asset:a']).update(FACTORY, 'token');

    expect(result.status).toBe(200);
    // The store is upserted in one write; nothing is deleted on the way.
    expect(mockedAxios.delete).not.toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('entityOperations/upsert'),
      expect.anything(),
      expect.anything(),
    );
  });

  it('still reports a real failure', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 503, data: { title: 'down' } } });

    await expect(service(['urn:asset:a']).update(FACTORY, 'token')).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
