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
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { TokenService } from '../endpoints/session/token.service';
import {
  factoryAllocatedAssetsKey,
  GLOBAL_ALLOCATED_ASSETS,
  SHOP_FLOOR_COUNTER,
} from '../endpoints/schemas/urn-holder.schema';
import {
  shopFloorNumber,
  UrnHolderService,
} from '../endpoints/urn-holder/urn-holder.service';

const SCORPIO_SHOP_FLOOR_STORE = 'urn:ngsi-ld:shopFloor-id-store';
const SCORPIO_GLOBAL_STORE = 'urn:ngsi-ld:global-allocated-assets-store';
const SCORPIO_FACTORY_STORE_PATTERN = ':allocated-assets$';
const SCORPIO_URN_HOLDER_TYPE = 'https://industry-fusion.org/base/v0.1/urn-holder';
const SHOP_FLOOR_TYPE = 'https://industry-fusion.org/base/v0.1/shopFloor';

/**
 * Creates the two bookkeeping records this application keeps for itself, once,
 * at startup.
 *
 * An installation that has them already is left alone — that is the whole
 * point of seeding rather than writing. What matters is where the first value
 * comes from on an installation that has been running against Scorpio:
 *
 *   1. whatever the Scorpio holder says, if it is still there;
 *   2. otherwise, for the counter, the highest shop floor id Scorpio holds;
 *   3. otherwise nothing has been created yet, so zero and an empty list.
 *
 * Step 2 is not a nicety. Seeding a fresh counter at zero on a factory that
 * already has shop floors would hand out ids that exist, and every new shop
 * floor would collide.
 *
 * Never fatal: a Scorpio that is briefly unreachable at boot must not stop the
 * service, and nothing is written when its answer cannot be trusted.
 */
@Injectable()
export class UrnHoldersBootstrap implements OnModuleInit {
  private readonly logger = new Logger(UrnHoldersBootstrap.name);
  private readonly scorpioUrl = process.env.SCORPIO_URL;

  constructor(
    private readonly tokenService: TokenService,
    private readonly holders: UrnHolderService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.FACTORY_AUTO_PROVISION === 'false') {
      this.logger.log('Holder seeding is switched off (FACTORY_AUTO_PROVISION=false).');
      return;
    }
    // Each on its own: one that cannot be read must not skip the others. The
    // counter is the one that matters most — a shop floor created against a
    // counter that was never carried over collides with ids already in use —
    // so its failure is reported in those terms.
    const steps: [string, () => Promise<void>][] = [
      ['the shop floor counter', () => this.seedShopFloorCounter()],
      ['the global allocated-asset list', () => this.seedGlobalAllocatedAssets()],
      ["each factory's allocated assets", () => this.seedFactoryAllocatedAssets()],
    ];
    for (const [what, run] of steps) {
      try {
        await run();
      } catch (err) {
        this.logger.error(
          `Could not seed ${what}: ${err?.message ?? err}. ` +
            'It will start from nothing on first use — check this before using the flow editor.',
        );
      }
    }
  }

  private async seedShopFloorCounter(): Promise<void> {
    if (await this.holders.has(SHOP_FLOOR_COUNTER)) return;

    const inherited = await this.lastShopFloorNumber();
    await this.holders.seedIfAbsent(SHOP_FLOOR_COUNTER, {
      lastNumber: inherited.number,
      width: 3,
    });
    this.logger.log(
      `Shop floor counter seeded at ${inherited.number} (${inherited.from}).`,
    );
  }

  private async seedGlobalAllocatedAssets(): Promise<void> {
    if (await this.holders.has(GLOBAL_ALLOCATED_ASSETS)) return;

    const assets = await this.assetsFromScorpio();
    await this.holders.seedIfAbsent(GLOBAL_ALLOCATED_ASSETS, { assets });
    this.logger.log(
      `Allocated-asset list seeded with ${assets.length} asset(s). ` +
        'It is rebuilt in full on the next allocation either way.',
    );
  }

  /**
   * Each factory's allocated assets, carried over from the entity that used
   * to hold them. One per factory, so the flow editor keeps showing what is
   * allocated where instead of starting empty.
   */
  private async seedFactoryAllocatedAssets(): Promise<void> {
    const headers = await this.headers();
    if (!headers) return;

    let stores: any[];
    try {
      const { data } = await axios.get(
        `${this.scorpioUrl}/?idPattern=${SCORPIO_FACTORY_STORE_PATTERN}&type=${SCORPIO_URN_HOLDER_TYPE}`,
        { headers },
      );
      stores = Array.isArray(data) ? data : [];
    } catch (err) {
      if (err?.response?.status === 404) return;
      throw err;
    }

    let seeded = 0;
    for (const store of stores) {
      const factoryId = String(store?.id ?? '').split(':allocated-assets')[0];
      if (!factoryId) continue;
      if (await this.holders.has(factoryAllocatedAssetsKey(factoryId))) continue;
      const assets = this.assetsOf(store);
      await this.holders.seedIfAbsent(factoryAllocatedAssetsKey(factoryId), { assets });
      seeded++;
    }
    if (seeded) {
      this.logger.log(`Carried over the allocated assets of ${seeded} factory/factories.`);
    }
  }

  /** The count to carry over, and where it was found — for the log line. */
  private async lastShopFloorNumber(): Promise<{ number: number; from: string }> {
    const headers = await this.headers();
    if (!headers) return { number: 0, from: 'no Scorpio to ask' };

    const store = await this.fetch(SCORPIO_SHOP_FLOOR_STORE, headers);
    if (store) {
      const key = Object.keys(store).find((k) => k.includes('last-urn'));
      const fromStore = shopFloorNumber(store[key]?.value);
      if (fromStore !== null) {
        return { number: fromStore, from: 'carried over from the Scorpio holder' };
      }
    }

    // No holder, or one nobody can read: ask what actually exists instead.
    try {
      const { data } = await axios.get(
        `${this.scorpioUrl}?type=${encodeURIComponent(SHOP_FLOOR_TYPE)}&limit=1000`,
        { headers },
      );
      const numbers = (Array.isArray(data) ? data : [])
        .map((entity: any) => shopFloorNumber(entity?.id))
        .filter((n: number | null): n is number => n !== null);
      if (numbers.length) {
        return {
          number: Math.max(...numbers),
          from: `highest of ${numbers.length} shop floor(s) already in Scorpio`,
        };
      }
    } catch (err) {
      // An unreadable list is not an empty one. Say so rather than seed a
      // counter that would collide with ids nobody could see.
      throw new Error(
        `the shop floors in Scorpio could not be listed (${err?.message ?? err})`,
      );
    }
    return { number: 0, from: 'no shop floors yet' };
  }

  /** The asset ids inside an allocated-assets entity, in either shape. */
  private assetsOf(store: Record<string, any> | null): string[] {
    if (!store) return [];
    const payload = store['http://www.industry-fusion.org/schema#last-data'] ?? {};
    const value = payload.json ?? payload.value ?? payload.object ?? {};
    const items =
      value['https://industry-fusion.org/base/v0.1/items'] ?? value.items ?? [];
    const list = Array.isArray(items) ? items : [items];
    return list
      .map((item: any) => (typeof item === 'string' ? item : item?.id))
      .filter((id: unknown): id is string => typeof id === 'string');
  }

  private async assetsFromScorpio(): Promise<string[]> {
    const headers = await this.headers();
    if (!headers) return [];
    return this.assetsOf(await this.fetch(SCORPIO_GLOBAL_STORE, headers));
  }

  private async headers(): Promise<Record<string, string> | null> {
    if (!this.scorpioUrl) {
      this.logger.warn('SCORPIO_URL is not set; seeding from what exists is skipped.');
      return null;
    }
    return {
      Authorization: 'Bearer ' + (await this.tokenService.getToken()),
      'Content-Type': 'application/ld+json',
      Accept: 'application/ld+json',
    };
  }

  /** One entity, or null when it is simply not there. */
  private async fetch(
    id: string,
    headers: Record<string, string>,
  ): Promise<Record<string, any> | null> {
    try {
      const { data } = await axios.get(`${this.scorpioUrl}/${id}`, { headers });
      return data ?? null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }
}
