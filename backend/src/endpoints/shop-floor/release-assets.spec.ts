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
import { ShopFloorService } from './shop-floor.service';

// No network from a test. The save path talks to Scorpio, and this file is
// about what happens in the cache, not out there.
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const FLOOR = 'urn:ngsi-ld:shopFloors:2:007';
const FACTORY = 'urn:ifric:ifx-eur-loc-fac-1';
const ASSET_A = 'urn:ifric:ifx-eur-nld-ast-a';
const ASSET_B = 'urn:ifric:ifx-eur-nld-ast-b';

/** The edges the flow editor sends: `<kind>_<entity id>` on both ends. */
const edge = (source: string, target: string) => ({ source, target });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SCORPIO_URL = 'http://scorpio.test/entities';
  // A shop floor as Scorpio returns it: the writes go through the NGSI-LD
  // guard, which rightly refuses an entity with no id.
  mockedAxios.get.mockResolvedValue({
    status: 200,
    data: {
      '@context': 'https://industryfusion.github.io/contexts/v0.1/context.jsonld',
      id: FLOOR,
      type: 'https://industry-fusion.org/base/v0.1/shopFloor',
    },
  } as any);
  mockedAxios.post.mockResolvedValue({ status: 204, data: {} } as any);
  mockedAxios.patch.mockResolvedValue({ status: 204, data: {} } as any);
  mockedAxios.delete.mockResolvedValue({ status: 204, data: {} } as any);
});

const build = () => {
  const cache = {
    releaseFromShopFloor: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateFactoryAndShopFloor: jest.fn().mockResolvedValue({}),
  };
  const service = new ShopFloorService(
    { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) } as any,
    {} as any,
    { updateRelations: jest.fn().mockResolvedValue({ status: 204 }) } as any,
    cache as any,
    {} as any,
  );
  // updateAssets talks to Scorpio; the release is what is under test here.
  jest.spyOn(service as any, 'updateAssets').mockResolvedValue({ status: 204 });
  return { service, cache };
};

describe('releasing assets when a flow is saved', () => {
  it('releases the last asset removed from a shop floor', async () => {
    // The floor is still under its factory but now carries nothing. Before,
    // the cleanup only ran for floors that still had an asset, so this asset
    // kept its factory forever and vanished from the available list.
    const { service, cache } = build();

    await service.updateReact([edge(`factory_${FACTORY}`, `shopFloor_${FLOOR}`)], 'token');

    expect(cache.releaseFromShopFloor).toHaveBeenCalledWith(FLOOR, []);
  });

  it('keeps the assets that are still on the floor', async () => {
    const { service, cache } = build();

    await service.updateReact(
      [
        edge(`factory_${FACTORY}`, `shopFloor_${FLOOR}`),
        edge(`shopFloor_${FLOOR}`, `asset_${ASSET_A}`),
      ],
      'token',
    );

    // A is still there and must not be released; anything else that claims
    // this floor — B, removed in this save — is.
    expect(cache.releaseFromShopFloor).toHaveBeenCalledWith(FLOOR, [ASSET_A]);
    expect(cache.releaseFromShopFloor.mock.calls[0][1]).not.toContain(ASSET_B);
  });

  it('does not fail the save when the release fails', async () => {
    const { service, cache } = build();
    cache.releaseFromShopFloor.mockRejectedValue(new Error('mongo down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      service.updateReact([edge(`factory_${FACTORY}`, `shopFloor_${FLOOR}`)], 'token'),
    ).resolves.toBeDefined();
  });
});
