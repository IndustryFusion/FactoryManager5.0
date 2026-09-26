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
import {
  shopFloorNumber,
  shopFloorUrn,
  UrnHolderService,
} from './urn-holder.service';

/**
 * A Mongo stand-in that applies $inc the way the server does — in one step,
 * which is the property the shop floor counter depends on.
 */
const fakeModel = (docs: Record<string, any> = {}) => ({
  docs,
  findOne: jest.fn(async ({ key }: any) => docs[key] ?? null),
  findOneAndUpdate: jest.fn(async ({ key }: any, update: any) => {
    const doc = docs[key] ?? { key, ...(update.$setOnInsert ?? {}) };
    for (const [field, by] of Object.entries(update.$inc ?? {})) {
      doc[field] = (doc[field] ?? 0) + (by as number);
    }
    Object.assign(doc, update.$set ?? {});
    docs[key] = doc;
    // A copy, as the driver returns: the caller must see the value from its
    // own update, not whatever the document has become since.
    return { ...doc };
  }),
  updateOne: jest.fn(async ({ key }: any, update: any) => {
    if (!docs[key]) docs[key] = { ...(update.$setOnInsert ?? {}) };
    return { acknowledged: true };
  }),
});

describe('shop floor ids', () => {
  it('formats and reads back the same number', () => {
    expect(shopFloorUrn(7)).toBe('urn:ngsi-ld:shopFloors:2:007');
    expect(shopFloorNumber('urn:ngsi-ld:shopFloors:2:007')).toBe(7);
    // Past the padding, the number simply grows — it is never truncated.
    expect(shopFloorUrn(1234)).toBe('urn:ngsi-ld:shopFloors:2:1234');
  });

  it('is not fooled by something that is not a shop floor id', () => {
    expect(shopFloorNumber('urn:ngsi-ld:shopFloors:2:abc')).toBeNull();
    expect(shopFloorNumber('urn:ngsi-ld:factories:2:001')).toBeNull();
    expect(shopFloorNumber(undefined as any)).toBeNull();
  });
});

describe('UrnHolderService', () => {
  it('hands out each number once, and never the same one twice', async () => {
    const model = fakeModel({ 'shop-floor-counter': { key: 'shop-floor-counter', lastNumber: 7, width: 3 } });
    const service = new UrnHolderService(model as any);

    // In parallel, as two people creating a shop floor at the same moment.
    const urns = await Promise.all([
      service.nextShopFloorUrn(),
      service.nextShopFloorUrn(),
      service.nextShopFloorUrn(),
    ]);

    expect(new Set(urns).size).toBe(3);
    expect(urns).toEqual([
      'urn:ngsi-ld:shopFloors:2:008',
      'urn:ngsi-ld:shopFloors:2:009',
      'urn:ngsi-ld:shopFloors:2:010',
    ]);
    // One round trip per id: the read-add-write that could hand out a
    // duplicate is gone.
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  it('starts from one when nothing has been created yet', async () => {
    const service = new UrnHolderService(fakeModel() as any);
    expect(await service.nextShopFloorUrn()).toBe('urn:ngsi-ld:shopFloors:2:001');
  });

  it('replaces the allocated-asset list wholesale, and reads it back', async () => {
    const service = new UrnHolderService(fakeModel() as any);

    expect(await service.getGlobalAllocatedAssets()).toEqual([]);
    await service.setGlobalAllocatedAssets(['urn:asset:a', 'urn:asset:b']);
    expect(await service.getGlobalAllocatedAssets()).toEqual(['urn:asset:a', 'urn:asset:b']);

    await service.setGlobalAllocatedAssets(['urn:asset:c']);
    expect(await service.getGlobalAllocatedAssets()).toEqual(['urn:asset:c']);
  });

  it('seeds only what is missing', async () => {
    const model = fakeModel({ 'shop-floor-counter': { key: 'shop-floor-counter', lastNumber: 42 } });
    const service = new UrnHolderService(model as any);

    expect(await service.seedIfAbsent('shop-floor-counter', { lastNumber: 0 })).toBe(false);
    expect(model.docs['shop-floor-counter'].lastNumber).toBe(42);

    expect(await service.seedIfAbsent('global-allocated-assets', { assets: [] })).toBe(true);
    expect(await service.has('global-allocated-assets')).toBe(true);
  });
});
