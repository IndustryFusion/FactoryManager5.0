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

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { toHttpException, upstreamMessage } from '../../utils/upstream-error';
import { UrnHolderService } from '../urn-holder/urn-holder.service';
import { assetCategoryOf } from '../../utils/asset-category';

/**
 * The suffix every per-factory allocated-assets store id ends with.
 *
 * Kept as one constant because the id is both built (`${factoryId}${SUFFIX}`)
 * and taken apart again (`split(SUFFIX)[0]`) in several places, and the two
 * must never drift.
 */
export const ALLOCATED_ASSETS_SUFFIX = ':allocated-assets';

/** Any id ending in that suffix, whatever scheme the factory id uses. */
const ALLOCATED_ASSETS_ID_PATTERN = '.*:allocated-assets$';

/** Scorpio's idPattern is a regex, so ids interpolated into one are escaped. */
const escapeForIdPattern = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LAST_DATA = 'http://www.industry-fusion.org/schema#last-data';
const ITEMS = 'https://industry-fusion.org/base/v0.1/items';

// This service no longer writes NGSI-LD: a factory's allocated assets are
// this application's own bookkeeping, held with the shop floor counter and
// the global list — see endpoints/urn-holder. What used to live here (the
// entity shape, the id-pattern query and its regex escaping) went with it.

@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService,
    private readonly factorySiteService: FactorySiteService,
    private readonly urnHolders: UrnHolderService
  ) {}

  async create(factoryId: string, token: string) {
    try{
      let assetArr = [];
      let reactData = await this.reactFlowService.findOne(factoryId);
      if(reactData && reactData.factoryData) {
        let nodes = reactData.factoryData['nodes'];
        nodes.forEach(data => {
          if(data.id.startsWith('asset')){
            let assetId = data.id.split('_')[1];
            assetArr.push(assetId);
          }
        })
      }
    // Remove duplicates
      assetArr = [...new Set(assetArr)];
      // Transform array into required format
      const formattedAssetArr = assetArr.map(id => ({ id }));
      if (assetArr.length > 0) {
        try {
            const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json'
          };
          // The factory's own list, kept with the other bookkeeping this
          // application owns — see endpoints/urn-holder. It used to be an
          // NGSI-LD `urn-holder` entity in Scorpio, which is a store of what
          // the factory *is*; this list is rebuilt from the flow and nothing
          // outside this app reads it.
          await this.urnHolders.setFactoryAllocatedAssets(factoryId, assetArr);
          await this.updateGlobal(token)
          return {
            status: HttpStatus.OK,
            statusText: 'Allocated assets updated'
          }
        } catch(err) {
          if(err instanceof HttpException) {
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
      } else {
        // Nothing to allocate is a result, not a failure — and it must carry a
        // status the callers understand. `status: true` compared false against
        // every check, so update() fell through it and returned nothing at all.
        return {
          status: HttpStatus.OK,
          statusText: 'No Allocated Assets Available'
        }
      }
    } catch(err){
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
  
async createGlobal(token: string) {
  try {
    const stores = await this.findAll(token);
    // One entry per asset, however many factories list it.
    const assetArr = [...new Set(stores.flatMap((store) => store.assets))].map((id) => ({ id }));

    try {
      // The list is this application's own bookkeeping, rebuilt in full from
      // the per-factory stores read above, so it is kept here rather than as
      // an entity in Scorpio — see endpoints/urn-holder. Written in one go, as
      // it was before: never deleted and left empty when a write fails.
      const assets = await this.urnHolders.setGlobalAllocatedAssets(
        assetArr.map((item) => item.id),
      );
      return {
        status: HttpStatus.OK,
        statusText: 'OK',
        data: assets
      }
    } catch(err) {
      throw new HttpException({
        errorCode: "FS_500",
        message: err.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  } catch(err) {
    if (err instanceof HttpException) {
      throw err;
    } else if (err.response) {
      throw new HttpException(upstreamMessage(err), err.response.status);
    } else {
      throw new HttpException(err.message, HttpStatus.NOT_FOUND);
    }
  }
}

  async findOne(factoryId: string, token: string) {
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const assetIds = (await this.urnHolders.getFactoryAllocatedAssets(factoryId))
        .map((id) => ({ id }));


      let finalArray = [];
      if (assetIds.length > 0) {
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i].id;
          try {
            const assetData = await this.assetService.getAssetDataById(id, token);
            const finalData = {
              id,
              product_name: assetData[Object.keys(assetData).find(key => key.includes("product_name"))]?.value, 
              // Products copied from IFX carry 'NULL' where a category was
              // never given; the entity's type answers instead.
              asset_category: assetCategoryOf({
                asset_category: assetData[Object.keys(assetData).find(key => key.includes("asset_category"))]?.value,
                type: assetData.type,
              })
            };
            finalArray.push(finalData);
          } catch(err) {
            continue;
          }
          
        }
      }
      return finalArray;
    } catch(err) {
      if(err instanceof HttpException) {
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

  /**
   * Every factory's allocated assets, in the shape the callers expect:
   * `{ id: '<factoryId>:allocated-assets', assets: [...] }`. The ids are the
   * same strings the entities used, so nothing above this had to change.
   */
  async findAll(token?: string) {
    try {
      const stores = await this.urnHolders.listFactoryAllocatedAssets();
      return stores.map((store) => ({
        id: `${store.factoryId}:allocated-assets`,
        factoryId: store.factoryId,
        assets: store.assets,
      }));
    } catch (err) {
      throw toHttpException(err);
    }
  }

  async findProductName(token: string){
    try{
      let finalData = {};
      let allocatedAssetData = await this.findAll(token);
      for(let i = 0; i < allocatedAssetData.length; i++){  
        let factoryId = allocatedAssetData[i].id;
        factoryId = factoryId.split(':allocated-assets')[0];
        let factoryData = await this.factorySiteService.findOne(factoryId, token);
        let factoryName = factoryData["http://www.industry-fusion.org/schema#factory_name"].value;
        const factorySpecificAssets = allocatedAssetData[i].assets.map((id) => ({ id }));
        finalData[factoryName] = [];
        for(let i = 0; i < factorySpecificAssets.length; i++){
          let assetData = await this.assetService.getAssetDataById(factorySpecificAssets[i].id, token);
          const productNameKey = Object.keys(assetData).find(key => key.toLowerCase().includes('product_name'));
          if (productNameKey && assetData[productNameKey].value) {
            finalData[factoryName].push(assetData[productNameKey].value);
          }
        }
      }
      return finalData;
    }catch(err){
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getGlobalAllocatedAssets(token: string) {
    try {
      const assets = await this.urnHolders.getGlobalAllocatedAssets();
      // Nothing recorded yet: build it once from the per-factory stores —
      // the same answer the missing-entity path in Scorpio used to give.
      if (!assets.length) {
        const rebuilt = await this.createGlobal(token);
        return Array.isArray(rebuilt?.data) ? rebuilt.data : [];
      }
      return assets;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Brings the factory's allocated-assets store in line with its flow.
   *
   * It used to delete the store and then re-create it, so a failure in the
   * second step left the factory with no store at all — and when the flow had
   * no assets left, create() reported "nothing to allocate", which did not
   * match the success check, so this returned undefined and the caller
   * answered 500 with the store already gone. That is what removing the last
   * asset from a shop floor did.
   *
   * Now: with assets, the store is replaced in one write; with none, it is
   * deleted, and a store that was never there is not an error. Either way the
   * global list is rebuilt and a status comes back.
   */
  async update(factoryId: string, token: string) {
    try {
      const id = `${factoryId}:allocated-assets`;
      const response = await this.create(factoryId, token);
      const hasAssets = response['statusText'] !== 'No Allocated Assets Available';

      if (!hasAssets) {
        try {
          await this.remove(id, token);
        } catch (err) {
          // Already absent: the end state asked for is the end state we have.
          if (err?.response?.status !== 404 && err?.getStatus?.() !== HttpStatus.NOT_FOUND) {
            throw err;
          }
        }
      }

      // create() rebuilds the global list only when it wrote a store; with the
      // last asset removed it still has to be taken out of the global list.
      const globalResponse = await this.updateGlobal(token);
      return {
        status: HttpStatus.OK,
        data: globalResponse?.data ?? [],
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async updateFormAllocatedAsset(data: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      for (let key in data) {
        try {
          // Added to whatever the factory already had — the same merge as
          // before, now against this application's own list rather than an
          // entity in Scorpio. No id pattern to escape and no query to get
          // wrong: the factory is the key.
          const existing = await this.urnHolders.getFactoryAllocatedAssets(key);
          const merged = [...new Set([...data[key], ...existing])];
          await this.urnHolders.setFactoryAllocatedAssets(key, merged);
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
      await this.updateGlobal(token);
      return {
        status: 201,
        message: 'Factory Allocated Assets Created successful',
      };
    } catch (err) {
      return err;
    }
  }

  // Removes an asset from every factory's allocated-assets store. Returns the id
  // of the (last) factory that had it, or '' when none did.
  async removeAssetFromStores(assetId: string, token: string) {
    let factoryId = '';
    for (const store of await this.findAll(token)) {
      if (!store.assets.includes(assetId)) continue;
      factoryId = store.factoryId;
      await this.urnHolders.setFactoryAllocatedAssets(
        store.factoryId,
        store.assets.filter((id) => id !== assetId),
      );
    }
    return factoryId;
  }

  async updateGlobal(token: string) {
    try{
      // createGlobal replaces the store in one request, so no delete first.
      let response =  await this.createGlobal(token);
      return {
        status: response.status,
        data: response.data,
      };
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  /** `id` is `<factoryId>:allocated-assets`, as it always was. */
  async remove(id:string, token: string) {
    try {
      const factoryId = id.split(':allocated-assets')[0];
      await this.urnHolders.deleteFactoryAllocatedAssets(factoryId);
      // A list that was never there is not an error: the end state asked for
      // is the end state we have.
      return {
        status: HttpStatus.NO_CONTENT,
        data: null,
      };
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
}