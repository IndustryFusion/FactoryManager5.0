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
import { AssetService } from './asset.service';

/** The private helper that decides what an import may overwrite. */
const displayFieldsOf = (row: any) =>
  (AssetService.prototype as any).displayFieldsOf.call({}, row);

describe('refreshing a product row from IFX', () => {
  it('takes the fields this app only displays', () => {
    const refreshed = displayFieldsOf({
      _id: 'mongo-id',
      product_name: 'MasterLINE X 3001.15 Laser',
      type: 'https://industry-fusion.org/base/v0.1/laserCutter',
      asset_status: 'complete',
      asset_cert_valid: true,
    });

    expect(refreshed).toMatchObject({
      product_name: 'MasterLINE X 3001.15 Laser',
      asset_status: 'complete',
      asset_cert_valid: true,
    });
    expect(refreshed).not.toHaveProperty('_id');
  });

  it('never touches where the asset sits in this factory', () => {
    // These three belong to this application. An asset standing on a shop
    // floor here must not be moved by anything IFX says about it.
    const refreshed = displayFieldsOf({
      product_name: 'Laser',
      factory_site: 'urn:ngsi-ld:factories:2:003',
      shop_floor: ['urn:ngsi-ld:shopFloors:2:007'],
      isCacheUpdated: true,
    });

    expect(refreshed).not.toHaveProperty('factory_site');
    expect(refreshed).not.toHaveProperty('shop_floor');
    expect(refreshed).not.toHaveProperty('isCacheUpdated');
  });

  it('cleans the category on the way through', () => {
    expect(
      displayFieldsOf({
        product_name: 'Laser',
        asset_category: 'NULL',
        type: 'https://industry-fusion.org/base/v0.1/laserCutter',
      }).asset_category,
    ).toBe('laserCutter');
  });

  it('asks for no write when there is nothing to write', () => {
    expect(displayFieldsOf(undefined)).toBeNull();
    expect(displayFieldsOf({ _id: 'only-an-id' })).toBeNull();
  });
});
