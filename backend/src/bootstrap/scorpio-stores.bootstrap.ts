//
// Copyright (c) 2024 IB Systems GmbH
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
import { prepareForScorpio } from '../utils/ngsi-ld';

/**
 * The holder entities this application needs in Scorpio before it can work.
 *
 * The README asked an operator to create these by hand with curl after every
 * deployment. They are created here instead, so a fresh PDT works without
 * that step.
 *
 * Both are also created lazily, by the first shop floor and the first
 * allocation, and that stays as it is. This only moves the work to startup so
 * a *read* before the first write does not meet a 404 — listing shop floors
 * on a brand-new installation, for instance.
 *
 * The factory id store that used to live alongside these is gone: a factory's
 * identifier now comes from the IFRIC registry, not from a counter held here.
 */
@Injectable()
export class ScorpioStoresBootstrap implements OnModuleInit {
  private readonly logger = new Logger(ScorpioStoresBootstrap.name);
  private readonly scorpioUrl = process.env.SCORPIO_URL;

  constructor(private readonly tokenService: TokenService) {}

  /** id -> the entity to create when it is missing. */
  private readonly stores: ReadonlyArray<{ id: string; entity: Record<string, any> }> = [
    {
      id: 'urn:ngsi-ld:shopFloor-id-store',
      entity: {
        '@context': 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld',
        id: 'urn:ngsi-ld:shopFloor-id-store',
        type: 'https://industry-fusion.org/base/v0.1/urn-holder',
        'last-urn': {
          type: 'Property',
          // Shop floor ids start at 001. Matches the README's seed exactly;
          // an installation that already has one keeps its own counter,
          // because an existing store is never touched.
          value: 'urn:ngsi-ld:shopFloors:2:000',
        },
      },
    },
    {
      id: 'urn:ngsi-ld:global-allocated-assets-store',
      entity: {
        '@context': 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld',
        id: 'urn:ngsi-ld:global-allocated-assets-store',
        type: 'https://industry-fusion.org/base/v0.1/urn-holder',
        'http://www.industry-fusion.org/schema#last-data': {
          type: 'Relationship',
          object: ['default'],
        },
      },
    },
  ];

  async onModuleInit(): Promise<void> {
    if (process.env.FACTORY_AUTO_PROVISION === 'false') {
      this.logger.log('Scorpio store provisioning is switched off (FACTORY_AUTO_PROVISION=false).');
      return;
    }
    if (!this.scorpioUrl) {
      this.logger.warn('SCORPIO_URL is not set; skipping store provisioning.');
      return;
    }

    try {
      const token = await this.tokenService.getToken();
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      for (const store of this.stores) {
        await this.ensure(store.id, store.entity, headers);
      }
    } catch (err) {
      // Never fatal. Scorpio being briefly unreachable at boot must not stop
      // the service from starting, and the lazy paths still create these on
      // first use.
      this.logger.error(
        `Could not provision the Scorpio stores: ${err?.message ?? err}. ` +
          'They will be created on first use instead.',
      );
    }
  }

  /**
   * Creates the store only when it is absent. An existing one is left exactly
   * as it is — overwriting the shop floor store would reset its counter and
   * hand out ids that are already taken.
   */
  private async ensure(
    id: string,
    entity: Record<string, any>,
    headers: Record<string, string>,
  ): Promise<void> {
    try {
      await axios.get(`${this.scorpioUrl}/${id}`, { headers });
      this.logger.log(`${id} is already present.`);
      return;
    } catch (err) {
      if (err?.response?.status !== 404) throw err;
    }

    const response = await axios.post(
      this.scorpioUrl,
      prepareForScorpio(entity, { label: id }),
      { headers },
    );
    this.logger.log(`Created ${id} (${response.status}).`);
  }
}
