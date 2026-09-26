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

const service = () =>
  new AllocatedAssetService(
    { getAssetDataById: jest.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
  );

/**
 * The flow editor asks what a factory has allocated before deciding whether
 * to create its store. On a factory that has allocated nothing, that question
 * used to answer 404 and abort the save it was meant to enable.
 */
describe('a factory with nothing allocated yet', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SCORPIO_URL = 'http://scorpio.test/entities';
  });

  it('answers with an empty list, not an error', async () => {
    mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

    await expect(service().findOne(FACTORY, 'token')).resolves.toEqual([]);
  });

  it('still reports a real failure as itself', async () => {
    // Scorpio unreachable is not an empty factory, and must not read as one.
    mockedAxios.get.mockRejectedValue({
      response: { status: 503, data: { title: 'unavailable' } },
    });

    await expect(service().findOne(FACTORY, 'token')).rejects.toBeInstanceOf(HttpException);
  });

  it('returns what is allocated when the store is there', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        'http://www.industry-fusion.org/schema#last-data': {
          type: 'JsonProperty',
          json: {
            'https://industry-fusion.org/base/v0.1/items': [{ id: 'urn:asset:a' }],
          },
        },
      },
    } as any);
    const allocated = service();
    (allocated as any).assetService.getAssetDataById.mockResolvedValue({
      'http://www.industry-fusion.org/schema#product_name': { value: 'Laser' },
      'http://www.industry-fusion.org/schema#asset_category': { value: 'cutter' },
    });

    await expect(allocated.findOne(FACTORY, 'token')).resolves.toEqual([
      { id: 'urn:asset:a', product_name: 'Laser', asset_category: 'cutter' },
    ]);
  });
});
