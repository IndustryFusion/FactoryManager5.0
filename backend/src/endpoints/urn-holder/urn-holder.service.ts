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
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GLOBAL_ALLOCATED_ASSETS,
  SHOP_FLOOR_COUNTER,
  UrnHolder,
} from '../schemas/urn-holder.schema';

/** The shape of a shop floor id, wherever one is built or read. */
export const SHOP_FLOOR_URN_PREFIX = 'urn:ngsi-ld:shopFloors:2:';
const DEFAULT_WIDTH = 3;

export const shopFloorUrn = (n: number, width = DEFAULT_WIDTH): string =>
  `${SHOP_FLOOR_URN_PREFIX}${String(n).padStart(width, '0')}`;

/** The number in a shop floor id, or null if it is not one. */
export const shopFloorNumber = (urn: string): number | null => {
  if (typeof urn !== 'string' || !urn.startsWith(SHOP_FLOOR_URN_PREFIX)) return null;
  const tail = urn.slice(SHOP_FLOOR_URN_PREFIX.length);
  return /^\d+$/.test(tail) ? parseInt(tail, 10) : null;
};

/**
 * The application's own bookkeeping: the shop floor counter, and the list of
 * allocated assets across every factory.
 *
 * See urn-holder.schema.ts for why these are here rather than in Scorpio.
 */
@Injectable()
export class UrnHolderService {
  constructor(
    @InjectModel(UrnHolder.name) private readonly holders: Model<UrnHolder>,
  ) {}

  /**
   * The next shop floor id, taken atomically.
   *
   * One `findOneAndUpdate` reserves the number, so two callers can never be
   * handed the same one — which the read-add-write against Scorpio could do.
   * The number is spent whether or not the shop floor is then created: ids
   * stay unique and the sequence may skip, which is the safe way round.
   */
  async nextShopFloorUrn(): Promise<string> {
    const holder = await this.holders.findOneAndUpdate(
      { key: SHOP_FLOOR_COUNTER },
      { $inc: { lastNumber: 1 }, $setOnInsert: { width: DEFAULT_WIDTH } },
      { new: true, upsert: true },
    );
    return shopFloorUrn(holder.lastNumber, holder.width ?? DEFAULT_WIDTH);
  }

  /** Every allocated asset id. Empty when nothing has been allocated yet. */
  async getGlobalAllocatedAssets(): Promise<string[]> {
    const holder = await this.holders.findOne({ key: GLOBAL_ALLOCATED_ASSETS });
    return holder?.assets ?? [];
  }

  /** Replaces the list wholesale, as the Scorpio entity was replaced. */
  async setGlobalAllocatedAssets(assets: string[]): Promise<string[]> {
    const holder = await this.holders.findOneAndUpdate(
      { key: GLOBAL_ALLOCATED_ASSETS },
      { $set: { assets } },
      { new: true, upsert: true },
    );
    return holder.assets ?? [];
  }

  /**
   * Writes a holder only when it is missing, for startup seeding.
   * Returns true when it wrote, so the caller can say what it did.
   */
  async seedIfAbsent(key: string, values: Partial<UrnHolder>): Promise<boolean> {
    const existing = await this.holders.findOne({ key });
    if (existing) return false;
    await this.holders.updateOne(
      { key },
      { $setOnInsert: { key, ...values } },
      { upsert: true },
    );
    return true;
  }

  async has(key: string): Promise<boolean> {
    return (await this.holders.findOne({ key })) !== null;
  }
}
