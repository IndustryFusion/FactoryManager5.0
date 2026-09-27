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

const service = (assets: string[] | null = null, assetData: any = {}) =>
  new AllocatedAssetService(
    { getAssetDataById: jest.fn().mockResolvedValue(assetData) } as any,
    {} as any,
    {} as any,
    {
      getFactoryAllocatedAssets: jest.fn().mockResolvedValue(assets ?? []),
    } as any,
  );

/**
 * The flow editor asks what a factory has allocated before deciding whether
 * to create its list. On a factory that has allocated nothing, that question
 * used to answer 404 and abort the save it was meant to enable.
 */
describe('a factory with nothing allocated yet', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SCORPIO_URL = 'http://scorpio.test/entities';
  });

  it('answers with an empty list, not an error', async () => {
    await expect(service([]).findOne(FACTORY, 'token')).resolves.toEqual([]);
  });

  it('returns what is allocated when the factory has a list', async () => {
    const allocated = service(['urn:asset:a'], {
      'http://www.industry-fusion.org/schema#product_name': { value: 'Laser' },
      'http://www.industry-fusion.org/schema#asset_category': { value: 'cutter' },
    });

    await expect(allocated.findOne(FACTORY, 'token')).resolves.toEqual([
      { id: 'urn:asset:a', product_name: 'Laser', asset_category: 'cutter' },
    ]);
  });

  it('still reports a real failure as itself', async () => {
    const allocated = new AllocatedAssetService(
      { getAssetDataById: jest.fn() } as any,
      {} as any,
      {} as any,
      { getFactoryAllocatedAssets: jest.fn().mockRejectedValue(new Error('mongo down')) } as any,
    );

    await expect(allocated.findOne(FACTORY, 'token')).rejects.toBeInstanceOf(HttpException);
  });
});
