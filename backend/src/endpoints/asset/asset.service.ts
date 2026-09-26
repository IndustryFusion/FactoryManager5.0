// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';
import { ImportAssetDto } from './dto/importAsset.dto';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
import { Request } from 'express';
import { CompactEncrypt } from 'jose';
import { createHash } from 'crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCacheService } from '../factory-pdt-cache/factory-pdt-cache.service';

import { upstreamMessage } from '../../utils/upstream-error';
import { assertCompliant, linkTargets, prepareForScorpio, replaceEntity, templateCache, toLinks, toNgsiLd } from '../../utils/ngsi-ld';
import { assetCategoryOf } from '../../utils/asset-category';
@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCacheModel: Model<FactoryPdtCache>,
    private readonly factoryPdtCacheService: FactoryPdtCacheService
  ) { }
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  private readonly templateSandboxUrl = process.env.TEMPLATE_SANDBOX_BACKEND_URL;
  private readonly scorpioTypesUrl = process.env.SCORPIO_TYPES_URL;
  private readonly context = process.env.CONTEXT;
  private readonly registryUrl = process.env.IFRIC_REGISTRY_BACKEND_URL;
  //private readonly pdtScorpioUrl = process.env.PDT_SCORPIO_URL;
  private readonly ifxurl = process.env.IFX_PLATFORM_BACKEND_URL;

  mask(input: string, key: string): string {
    return input.split('').map((char, i) =>
      (char.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, '0')
    ).join('');
  }

  deriveKey(secret: string): Uint8Array {
    const hash = createHash('sha256');
    hash.update(secret);
    return new Uint8Array(hash.digest());
  }

  async encryptData(data: string) {
    const encoder = new TextEncoder();
    const encryptionKey = await this.deriveKey(process.env.JWT_SECRET);

    const encrypted = await new CompactEncrypt(encoder.encode(data))
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .encrypt(encryptionKey);
    return encrypted;
  }


  /**
   * Industrial template types from the template sandbox, replacing the Scorpio
   * `urn:ngsi-ld:asset-type-store` entity that this codebase is moving away from
   * (it no longer exists — Scorpio 404s on it, which broke every asset listing).
   *
   * Only the industrial subset is used: /templates/mongo-templates returns ~9,995
   * templates covering the whole catalogue (bath mats, office paper), while
   * /templates/industrial returns the ~1,855 that can actually be factory assets.
   *
   * Cached because the catalogue is large and changes rarely.
   */
  private industrialTypesCache: { types: string[]; fetchedAt: number } | null = null;
  private static readonly TYPES_TTL_MS = 60 * 60 * 1000;

  private async getIndustrialTypes(): Promise<string[]> {
    const cached = this.industrialTypesCache;
    if (cached && Date.now() - cached.fetchedAt < AssetService.TYPES_TTL_MS) {
      return cached.types;
    }
    const response = await axios.get(`${this.templateSandboxUrl}/templates/industrial`);
    const types = (Array.isArray(response.data) ? response.data : [])
      .map((template: any) => template?.id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    this.industrialTypesCache = { types, fetchedAt: Date.now() };
    this.logger.log(`Loaded ${types.length} industrial template types from the sandbox`);
    return types;
  }

  /**
   * Fetches every Scorpio entity whose type is a known industrial template type.
   *
   * Scorpio accepts a comma-separated `type` list, so this batches instead of
   * issuing one request per type. Batch size 100 keeps the URL near 5.5 KB —
   * 200 types (~11 KB) is rejected by the server.
   */
  private async fetchEntitiesForIndustrialTypes(token: string): Promise<any[]> {
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    };
    const types = await this.getIndustrialTypes();
    const batchSize = 100;
    const entities: any[] = [];

    for (let i = 0; i < types.length; i += batchSize) {
      const batch = types.slice(i, i + batchSize);
      try {
        const response = await axios.get(this.scorpioUrl, {
          headers,
          params: { type: batch.join(',') },
        });
        if (Array.isArray(response.data)) entities.push(...response.data);
      } catch (err) {
        // One bad batch must not lose the whole listing.
        this.logger.warn(`Asset batch ${i / batchSize + 1} failed: ${err?.message}`);
      }
    }
    return entities;
  }

  async getAssetData(token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      return await this.fetchEntitiesForIndustrialTypes(token);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getAssetManagementData(company_ifric_id: string, token: string, req: Request) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const registryHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers['authorization']
      };

      // we need to remove registry company twin call Factory server as each factory has its own scorpio
      const companyData = await axios.get(`${this.registryUrl}/auth/get-company-details/${company_ifric_id}`, { headers: registryHeaders });
      if (!(companyData.data.length)) {
        throw new HttpException('No company found with the provided ID', HttpStatus.NOT_FOUND);
      }

      const response = await axios.get(`${this.registryUrl}/auth/get-owner-asset/${companyData.data[0]['_id']}`, { headers: registryHeaders });

      const result = [];
      const batchSize = 50;

      const batches = [];
      for (let i = 0; i < response.data.length; i += batchSize) {
        batches.push(response.data.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await Promise.all(
          batch.map(async (asset) => {
            const assetId = asset.asset_ifric_id;
            try {
              const response = await axios.get(`${this.scorpioUrl}/${assetId}`, { headers });
              return result.push(response.data);
            } catch (err) {
              if (err.response?.status === 404) {
                return null;
              } else if (err.response) {
                throw new HttpException({
                  errorCode: `FS_${err.response.status}`,
                  message: upstreamMessage(err)
                }, err.response.status);
              } else {
                throw new HttpException({
                  errorCode: "FS_500",
                  message: err.message
                }, HttpStatus.INTERNAL_SERVER_ERROR);
              }
            }
          })
        );
      }

      return result;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getAssetDataById(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.get(url, { headers });
      if (response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getAllAssets(token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      let finalResult = [];

      const typesResponse = await axios.get(this.scorpioTypesUrl, { headers });
      for (const type of typesResponse.data.typeList) {
        try {
          const url = this.scorpioUrl + '/?type=' + type;
          const response = await axios.get(url, { headers });
          finalResult.push(...response.data);
        } catch(err) {
          if (err.response) {
            throw new HttpException({
              errorCode: `FS_${err.response.status}`,
              message: upstreamMessage(err)
            }, err.response.status);
          } else {
            throw new HttpException({
              errorCode: "FS_500",
              message: err.message
            }, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }
      }
      if (finalResult.length < 0) {
        throw new NotFoundException('No assets found');
      }
      return finalResult;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getkeyValuesById(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id + '?options=keyValues';
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getAssetByType(type: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '?type=' + type;
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getAssetIds(token: string) {
    try {
      const assetData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const entities = await this.fetchEntitiesForIndustrialTypes(token);
      entities.forEach(entity => assetData.push(entity.id));
      return assetData;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }


  /**
   * Finds every asset that references `assetId` through any NGSI-LD Relationship.
   *
   * This used to build the relationship property name by string surgery on
   * asset_category, e.g. "3d Printers template" -> last word "template" ->
   * ".../v0.1/Template", then querying Scorpio for that key. asset_category is
   * the template catalogue's *title*, and every title in that catalogue ends
   * with the literal word " template" — so the lookup was really searching for
   * a property named "Template", which nothing is ever stored under. It matched
   * nothing, always.
   *
   * The relationship property names are defined by each asset's own template
   * schema (updateRelations only ever matches keys already present on the
   * entity, it never invents them), so they cannot be reconstructed from the
   * category. Instead of guessing, scan for relationships that actually point
   * at this asset. Returns the parent entity together with the key that matched.
   */
  private async findParentAssets(assetId: string, token: string): Promise<Array<{ parent: any; relationKey: string }>> {
    let allAssets: any[];
    try {
      allAssets = await this.getAssetData(token);
    } catch (err) {
      // getAssetData reads the type registry (urn:ngsi-ld:asset-type-store); if
      // that entity is missing from Scorpio the asset list cannot be built. That
      // is not a reason to fail the caller — a dashboard panel should render
      // empty, and deleting an asset must not be blocked by it.
      this.logger.warn(
        `Could not enumerate assets to resolve parents of ${assetId}: ${err?.message}`,
      );
      return [];
    }
    const matches: Array<{ parent: any; relationKey: string }> = [];

    for (const parent of allAssets) {
      if (!parent || parent.id === assetId) continue;
      for (const [key, value] of Object.entries<any>(parent)) {
        const entries = Array.isArray(value) ? value : [value];
        const points = entries.some((entry) => entry && entry.type === 'Relationship') && linkTargets(value).includes(assetId);
        if (points) matches.push({ parent, relationKey: key });
      }
    }
    return matches;
  }

  async getParentIds(assetId: string, assetCategory: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      // assetCategory is no longer used to locate parents — see findParentAssets.
      // It stays in the signature so the existing frontend contract is unchanged.
      const parents = await this.findParentAssets(assetId, token);
      return parents.map(({ parent }) => ({
        id: parent['id'],
        product_name: parent[Object.keys(parent).find(key => key.includes("product_name"))],
        asset_category: parent[Object.keys(parent).find(key => key.includes("asset_category"))]
      }));
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }


  async setFactoryOwnerAssets(company_ifric_id: string, token: string, req: Request) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      
      const ifxHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers['authorization']
      };

      const tag = `[asset-copy ${company_ifric_id}]`;
      this.logger.log(`${tag} start: asking IFX for the company's owned products`);

      const [scorpioDataResponseRaw, cacheDataResponse] = await Promise.all([
        axios.get(`${this.ifxurl}/asset/get-owner-asset/${company_ifric_id}`, { headers: ifxHeaders }),
        axios.get(`${this.ifxurl}/company/get-asset-and-purchaced-pdt-cache/${company_ifric_id}`, { headers: ifxHeaders })
      ]);

      // IFX puts null in the list for an owned product it could not load.
      const ownedRaw = Array.isArray(scorpioDataResponseRaw.data) ? scorpioDataResponseRaw.data : [scorpioDataResponseRaw.data];
      const scorpioDataResponse = ownedRaw.filter((asset) => asset && typeof asset.id === 'string');
      const ifxCacheRows = cacheDataResponse.data ?? {};
      this.logger.log(
        `${tag} IFX returned ${scorpioDataResponse.length} owned product(s)` +
        (ownedRaw.length !== scorpioDataResponse.length ? ` (${ownedRaw.length - scorpioDataResponse.length} owned but not loadable from IFX's Scorpio)` : '') +
        ` and ${Object.keys(ifxCacheRows).length} product-list row(s)` +
        (scorpioDataResponse.length ? `: ${scorpioDataResponse.map((a) => a.id).join(', ')}` : '') +
        (scorpioDataResponse.length === 0 ? ' - nothing to copy; the registry lists no products owned by this company (a product is owned after Generate PDT / Create Product)' : '')
      );

      // IFX products are free-form JSON-LD; FactoryManager's Scorpio holds only
      // compliant NGSI-LD, so each new product goes through the adapter first.
      const templateFor = templateCache();

      const batchSize = 50;
      const scorpioUpdatedAssetIds = [], cacheUpdatedAssetIds = [];
      // One line per product: what came from IFX and what was saved locally.
      const outcomes: { id: string; product_name?: string; scorpio: string; cache: string }[] = [];

      for (let i = 0; i < scorpioDataResponse.length; i += batchSize) {
        const batch = scorpioDataResponse.slice(i, i + batchSize);
        const promises = batch.map(async (asset: any) => {
          const assetId = asset.id;
          const outcome = { id: assetId, product_name: ifxCacheRows[assetId]?.product_name, scorpio: '', cache: '' };
          outcomes.push(outcome);
          // Only give a product a cache row once its Scorpio copy exists, so a
          // refused conversion never shows up as a product without data.
          let inScorpio = false;
          try {
            await axios.get(`${this.scorpioUrl}/${assetId}`, { headers });
            inScorpio = true;
            outcome.scorpio = 'already in local Scorpio (left unchanged; Sync updates it)';
          } catch (err) {
            if (err.response?.status === 404) {
              const template = await templateFor(asset.type, company_ifric_id, ifxCacheRows[assetId]?.product_name);
              const { entity, dropped, warnings, inferred } = toNgsiLd(asset, template);
              warnings.forEach((warning) => this.logger.warn(`${tag} ${assetId}: ${warning}`));
              assertCompliant(entity, { label: `product ${assetId}` });
              await axios.post(this.scorpioUrl, entity, { headers });
              inScorpio = true;
              scorpioUpdatedAssetIds.push(assetId);
              outcome.scorpio =
                `copied: ${Object.keys(asset).length} attribute(s) from IFX -> ${Object.keys(entity).length} saved` +
                ` (${dropped.length} empty removed${inferred.length ? `, ${inferred.length} custom field(s) typed by inference` : ''})`;
            } else if (err.response) {
              throw new HttpException({
                errorCode: `FS_${err.response.status}`,
                message: upstreamMessage(err)
              }, err.response.status);
            } else {
              throw new HttpException({
                errorCode: "FS_500",
                message: err.message
              }, HttpStatus.INTERNAL_SERVER_ERROR);
            }
          } finally {
            const exists = await this.factoryPdtCacheModel.exists({ id: assetId, company_ifric_id });
            if (exists) {
              outcome.cache = 'row already present';
            } else if (!inScorpio) {
              outcome.cache = 'not created: the product is not in local Scorpio';
            } else if (!ifxCacheRows[assetId]) {
              outcome.cache = "not created: IFX has no product-list row for it under this company (the Assets table will not show it)";
            } else {
              const { _id, ...newCacheData } = ifxCacheRows[assetId];
              // Cleaned on the way in, so a row imported before IFX stopped
              // writing 'NULL' does not carry it onto the factory flow.
              newCacheData.asset_category = assetCategoryOf(newCacheData);
              await this.factoryPdtCacheModel.create(newCacheData);
              cacheUpdatedAssetIds.push(assetId);
              outcome.cache = 'row created (shows in the Assets table)';
            }
          }
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const reason = result.reason?.getResponse?.() ?? result.reason?.message;
            const outcome = outcomes.find((o) => o.id === batch[index]?.id);
            if (outcome && !outcome.scorpio) outcome.scorpio = `FAILED: ${JSON.stringify(reason)}`;
            this.logger.error(`${tag} ${batch[index]?.id} not copied into FactoryManager: ${JSON.stringify(reason)}`);
          }
        });
      }

      outcomes.forEach((o) => this.logger.log(`${tag} ${o.id}${o.product_name ? ` "${o.product_name}"` : ''}: Scorpio ${o.scorpio || 'unknown'}; cache ${o.cache || 'unknown'}`));
      this.logger.log(
        `${tag} done: ${scorpioUpdatedAssetIds.length} copied into local Scorpio, ` +
        `${outcomes.filter((o) => o.scorpio.startsWith('already')).length} already there, ` +
        `${outcomes.filter((o) => o.scorpio.startsWith('FAILED')).length} failed; ${cacheUpdatedAssetIds.length} Assets-table row(s) created`
      );

      // Patch updates isScorpioUpdated and isCacheUpdated in ifx together at end
      await Promise.all([
        axios.patch(`${this.ifxurl}/company/update-is-scorpio-updated/${company_ifric_id}`, scorpioUpdatedAssetIds, { headers: ifxHeaders }),
        axios.patch(`${this.ifxurl}/company/update-is-cache-updated/${company_ifric_id}`, cacheUpdatedAssetIds, { headers: ifxHeaders }),
      ]);

      return {
        success: true,
        status: 201,
        message: 'Scorpio and cache updated successfully',
        // The same per-product report, so it shows in the browser console too.
        report: { ifxOwnedProducts: scorpioDataResponse.length, copied: scorpioUpdatedAssetIds.length, cacheRowsCreated: cacheUpdatedAssetIds.length, products: outcomes },
      };
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || upstreamMessage(err).includes("network") || err.message.includes("network")) {
        // Deliberately not an error for the page, but it must not be silent.
        this.logger.warn(`[asset-copy ${company_ifric_id}] skipped: IFX or Scorpio unreachable (${err.code ?? err.message})`);
        return {
          success: true,
          status: 200,
          message: "IFX fetch and scorpio update skipped due to network issues."
        };
      }
      this.logger.error(`[asset-copy ${company_ifric_id}] failed: ${err.response?.status ?? ''} ${upstreamMessage(err)}`);
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async setAssetData(data: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      // The type-store read that used to be here was dead weight: the types it
      // collected into `uniqueType` were only consumed by the write-back block
      // below, which is commented out. It performed no validation and gated
      // nothing — it just made every save depend on an entity that no longer
      // exists in Scorpio. Removing it changes no behaviour.
      // sending multiple requests to scorpio to save the asset array
      let response;
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          try {
            response = await axios.post(this.scorpioUrl, prepareForScorpio(data[i]), { headers });
          } catch (err) {
            throw err;
          }
        }
      } else {
        try {
          response = await axios.post(this.scorpioUrl, prepareForScorpio(data), { headers });
        } catch (err) {
          throw err;
        }
      }
      // if(uniqueType.length > 0){
      //   typeData.data["http://www.industry-fusion.org/schema#type-data"].object = [...typeArr, ...uniqueType];
      //   await this.deleteAssetById('urn:ngsi-ld:asset-type-store',token);
      //   await axios.post(this.scorpioUrl, typeData.data, {headers});
      // }
      return {
        status: response.status,
        statusText: response.statusText
      }
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async updateAssetById(id: string, data, token: string) {
    try {
      data['@context'] = this.context;
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id + '/attrs';
      const response = await axios.post(url, prepareForScorpio(data, { requireId: false, label: `update for ${id}` }), { headers });
      return {
        status: response.status,
        data: response.data
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async updateRelations(data, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const responses = [];
      for (let key in data) {
        const assetData = await this.getAssetDataById(key, token);
        let relationData = data[key], assetIds = [];
        for (let relationKey in relationData) {
          let finalKey = Object.keys(assetData).find(key => key.includes(relationKey))
          let relationArray = relationData[relationKey];
          assetIds.push(...relationArray);
          // The slot's settings (class, relationship_type, ...) from whichever link
          // instance exists; the targets are the new wiring.
          const current = Array.isArray(assetData[finalKey]) ? assetData[finalKey][0] : assetData[finalKey];
          const { type, object, datasetId, ...settings } = current ?? {};
          const links = toLinks(relationArray, settings);
          if (links) assetData[finalKey] = links;
          else delete assetData[finalKey];
        }

        try {
          // One replace instead of delete-then-create, which lost the product
          // whenever the create failed.
          const response = await replaceEntity(this.scorpioUrl, assetData, headers);
          responses.push(response);
        } catch(err) {
          if (err instanceof HttpException) {
            throw err;
          } else if (err.response) {
            throw new HttpException({
              errorCode: `FS_${err.response.status}`,
              message: upstreamMessage(err)
            }, err.response.status);
          } else {
            throw new HttpException({
              errorCode: "FS_500",
              message: err.message
            }, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }

        // update children assetIds factory_site and shop_floor data
        if(assetIds.length) {
          // fetch asset cache data for parent asset
          const assetCacheData = await this.factoryPdtCacheModel.find({id: key}).lean();
          if(assetCacheData.length) {
            // Ensure shop_floor is always an array for MongoDB operations
            const shopFloorArray = Array.isArray(assetCacheData[0].shop_floor) 
              ? assetCacheData[0].shop_floor 
              : (assetCacheData[0].shop_floor ? [assetCacheData[0].shop_floor] : []);
            
            // need to remove shop_floor for assets removed from the shopfloor
            // filter out assets which are matching with current shop_floor but not present in react flow
            const matchingAssetData = await this.factoryPdtCacheModel.find({ shop_floor: { $in: shopFloorArray } }).lean();
            
            if(matchingAssetData.length) {
              const matchingAssetIds = matchingAssetData.map(asset => asset.id);
              const filteredAssetIds = matchingAssetIds.filter(id => !assetIds.includes(id));
              await this.factoryPdtCacheModel.updateMany(
                {id: {$in: filteredAssetIds}},
                [
                  {
                    $set: {
                      shop_floor: {
                        $setDifference: ["$shop_floor", shopFloorArray]  // remove shop_floor for filtered assetIds
                      }
                    }
                  },
                  {
                    $set: {
                      factory_site: {
                        $cond: [
                          { $eq: ["$shop_floor", []] }, // set factory_site to "" when shop_floor becomes empty array after update
                          "",   
                          "$factory_site"                 
                        ]
                      }
                    }
                  }
                ]
              )
            }
            await this.factoryPdtCacheService.updateFactoryAndShopFloor({assetIds: assetIds, factory_site: assetCacheData[0].factory_site, shop_floor: assetCacheData[0].shop_floor});
          }
        }
      }

      if (responses.length === Object.keys(data).length) {
        return {
          success: true,
          status: 204,
          message: 'All updates were successful',
        };
      } else {
        return {
          success: false,
          status: 500,
          message: 'Some updates failed',
        };
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async deleteAssetById(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.delete(url, { headers });
      return {
        status: response.status,
        data: response.data
      }
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async deleteAssetRelation(assetId: string, token: string, reactFlowService: ReactFlowService, allocatedAssetService: AllocatedAssetService) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let factoryId = '';
      try {
        // Delete AssetId From Factory Specific Allocated Asset. The store keeps
        // its asset list as structured data, which a q-query cannot look into,
        // so scan the stores (the old q-query never matched anything).
        factoryId = await allocatedAssetService.removeAssetFromStores(assetId, token);
      } catch(err) {
        if (err instanceof HttpException) {
          throw err;
        } else if (err.response) {
          throw new HttpException({
            errorCode: `FS_${err.response.status}`,
            message: upstreamMessage(err)
          }, err.response.status);
        } else {
          throw new HttpException({
            errorCode: "FS_500",
            message: err.message
          }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

      // Update Global Allocated Assets
      await allocatedAssetService.updateGlobal(token);

      try {
        // Remove AssetId From HasAsset Relation Of ShopFloor
        let shopFloorUrl = `${this.scorpioUrl}?q=http://www.industry-fusion.org/schema%23hasAsset==%22${assetId}%22`;
        const shopFloorResponse = await axios.get(shopFloorUrl, { headers });
        if (shopFloorResponse.data.length > 0) {
          const shopFloor = shopFloorResponse.data[0];
          const hasAssetKey = "http://www.industry-fusion.org/schema#hasAsset";
          const links = toLinks(linkTargets(shopFloor[hasAssetKey]).filter((id) => id !== assetId));
          if (links) shopFloor[hasAssetKey] = links;
          else delete shopFloor[hasAssetKey];
          await replaceEntity(this.scorpioUrl, shopFloor, headers);
        }
      } catch(err) {
        if (err instanceof HttpException) {
          throw err;
        } else if (err.response) {
          throw new HttpException({
            errorCode: `FS_${err.response.status}`,
            message: upstreamMessage(err)
          }, err.response.status);
        } else {
          throw new HttpException({
            errorCode: "FS_500",
            message: err.message
          }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

      // Detach this asset from every parent that references it.
      // Previously the parent's relationship key was reconstructed from
      // asset_category, which never matched anything — so this cleanup silently
      // did nothing and left dangling references behind. findParentAssets
      // reports the real key that pointed at the asset.
      const parentMatches = await this.findParentAssets(assetId, token);
      if (parentMatches.length > 0) {
        for (const { parent, relationKey } of parentMatches) {
          const relationData = parent[relationKey];
          const first = Array.isArray(relationData) ? relationData[0] : relationData;
          const { type, object, datasetId, ...settings } = first ?? {};
          const links = toLinks(linkTargets(relationData).filter((id) => id !== assetId), settings);
          if (links) parent[relationKey] = links;
          else delete parent[relationKey];
          try {
            await replaceEntity(this.scorpioUrl, parent, headers);
          } catch(err) {
            if (err instanceof HttpException) {
              throw err;
            } else if (err.response) {
              throw new HttpException({
                errorCode: `FS_${err.response.status}`,
                message: upstreamMessage(err)
              }, err.response.status);
            } else {
              throw new HttpException({
                errorCode: "FS_500",
                message: err.message
              }, HttpStatus.INTERNAL_SERVER_ERROR);
            }
          }
        }
      }

      if (factoryId.length > 0) {
        await reactFlowService.findFactoryAndShopFloors(factoryId, token);
      }
      // Delete AssetId From Scorpio
      try {
        const finalUrl = this.scorpioUrl + '/' + assetId;
        let deleteResponse = await axios.delete(finalUrl, { headers });
        return {
          status: deleteResponse.status,
          data: deleteResponse.data
        }
      } catch(err) {
        if (err.response) {
          throw new HttpException({
            errorCode: `FS_${err.response.status}`,
            message: upstreamMessage(err)
          }, err.response.status);
        } else {
          throw new HttpException({
            errorCode: "FS_500",
            message: err.message
          }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
}