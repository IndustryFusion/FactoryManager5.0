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
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * The two bookkeeping records this application keeps for itself.
 *
 * Both used to be NGSI-LD entities in Scorpio, which is a store of what the
 * factory *is*. Neither of these describes the factory: one is a sequence,
 * the other a list rebuilt from entities Scorpio already holds. They live
 * here instead, where a counter can be incremented atomically — in Scorpio it
 * was read, added to and written back, so two people creating a shop floor in
 * the same moment could take the same number.
 *
 * One document per `key`:
 *
 *   shop-floor-counter        lastNumber, width  -> urn:ngsi-ld:shopFloors:2:007
 *   global-allocated-assets   assets             -> every allocated asset id
 *   allocated-assets:<factory> assets            -> that factory's allocated assets
 */
export const SHOP_FLOOR_COUNTER = 'shop-floor-counter';
export const GLOBAL_ALLOCATED_ASSETS = 'global-allocated-assets';

/**
 * One factory's allocated assets. Held here for the same reason as the other
 * two: the list is this application's own bookkeeping, rebuilt from the flow,
 * and nothing outside it reads the entity — the PDT does not know the
 * `urn-holder` type at all.
 */
export const factoryAllocatedAssetsKey = (factoryId: string) =>
  `allocated-assets:${factoryId}`;

/** The factory a per-factory key belongs to, or null for any other key. */
export const factoryOfAllocatedAssetsKey = (key: string): string | null =>
  key.startsWith('allocated-assets:') ? key.slice('allocated-assets:'.length) : null;

@Schema({ collection: 'urn_holders' })
export class UrnHolder extends Document {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  /** The last number handed out. Only on the counter. */
  @Prop({ type: Number })
  lastNumber?: number;

  /** How many digits that number is padded to, so 7 reads as 007. */
  @Prop({ type: Number })
  width?: number;

  /** Every allocated asset id. Only on the allocated-assets holder. */
  @Prop({ type: [String] })
  assets?: string[];
}

export type UrnHolderDocument = UrnHolder;
export const UrnHolderSchema = SchemaFactory.createForClass(UrnHolder);
