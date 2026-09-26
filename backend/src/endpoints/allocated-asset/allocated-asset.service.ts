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
import axios from 'axios';
import { AssetService } from '../asset/asset.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { upstreamMessage } from '../../utils/upstream-error';
import { UrnHolderService } from '../urn-holder/urn-holder.service';
import { attrValue, prepareForScorpio, replaceEntity } from '../../utils/ngsi-ld';
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

// The {id} items of an allocated-assets store. Reads the compliant JsonProperty
// form (kept verbatim, so `items` may be unexpanded) and the old Property form,
// whose object value Scorpio expanded to full IRIs.
const allocatedItems = (store: Record<string, any> | undefined): { id: string }[] => {
  const payload = attrValue(store?.[LAST_DATA]);
  const items = payload?.[ITEMS] ?? payload?.items;
  const list = Array.isArray(items) ? items : items?.id ? [items] : [];
  return list.filter((item) => typeof item?.id === 'string');
};

// An allocated-assets store in the compliant form: the item list is structured
// data, so it is a JsonProperty (a Property with an object value is dropped by
// the platform's Debezium bridge).
const allocatedStore = (id: string, items: { id: string }[]) => ({
  "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
  id,
  type: "urn-holder",
  [LAST_DATA]: { type: 'JsonProperty', json: { [ITEMS]: items } },
});
@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService,
    private readonly factorySiteService: FactorySiteService,
    private readonly urnHolders: UrnHolderService
  ) {}
  private readonly scorpioUrl = process.env.SCORPIO_URL;

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
          let id = `${factoryId}:allocated-assets`;
          const data = prepareForScorpio(allocatedStore(id, formattedAssetArr), { label: `allocated assets ${id}` });
          let response = await axios.post(this.scorpioUrl, data, {headers});
          await this.updateGlobal(token)
          return {
            status: response.status,
            statusText: response.statusText
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
        return {
          status: true,
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
    let allocatedAssetData = await this.findAll(token);
    console.log("allocatedAssetData createGlobal",allocatedAssetData)
    let assetArr = [];
    
    for(let i = 0; i < allocatedAssetData.length; i++) {
      assetArr = [...assetArr, ...allocatedItems(allocatedAssetData[i])];
    }

    // Remove duplicates while preserving object structure
    assetArr = Array.from(
      new Set(assetArr.map(item => JSON.stringify(item)))
    ).map(item => JSON.parse(item));

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
      let id = `${factoryId}:allocated-assets`;
      //fetch the allocated assets from scorpio
      const fetchUrl = `${this.scorpioUrl}/${id}`;
      let response: { data?: any };
      try {
        response = await axios.get(fetchUrl, { headers });
      } catch (err) {
        // A factory that has allocated nothing yet has no store, and that is
        // an answer, not a failure: nothing is allocated. Reported as a 404 it
        // aborted the caller — the flow editor asks this before deciding
        // whether to create the store, so saving a factory's first allocation
        // failed on the very question meant to allow it.
        if (err?.response?.status === 404) {
          return [];
        }
        throw err;
      }

      let assetIds = allocatedItems(response.data);

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

  async findAll(token: string) {
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      //fetch the allocated assets from scorpio
      // Matched on the suffix alone. This used to be anchored to
      // `urn:ngsi-ld:.*`, which silently returned an empty list — not an
      // error — for any store whose factory id used a different scheme, and
      // that emptiness then propagated into asset deletion and the global
      // store rebuild. The type filter is what actually narrows the query.
      const fetchUrl = `${this.scorpioUrl}/?idPattern=${ALLOCATED_ASSETS_ID_PATTERN}&type=https://industry-fusion.org/base/v0.1/urn-holder`;

      let response = await axios.get(fetchUrl, {
        headers
      });
      // console.log("findAll",response.data) 
      return response.data;
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

  async findProductName(token: string){
    try{
      let finalData = {};
      let allocatedAssetData = await this.findAll(token);
      for(let i = 0; i < allocatedAssetData.length; i++){  
        let factoryId = allocatedAssetData[i].id;
        factoryId = factoryId.split(':allocated-assets')[0];
        let factoryData = await this.factorySiteService.findOne(factoryId, token);
        let factoryName = factoryData["http://www.industry-fusion.org/schema#factory_name"].value;
        const factorySpecificAssets = allocatedItems(allocatedAssetData[i]);
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

  async update(factoryId: string, token: string) {
    try{
      let id = `${factoryId}:allocated-assets`;
      let deleteResponse = await this.remove(id, token);
      if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
        let response =  await this.create(factoryId, token);
        if(response['status'] == 200 || response['status'] == 201) {
          let globalResponse = await this.updateGlobal(token); 
          return {
            status: globalResponse.status,
            data: globalResponse.data,
          };
        }
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

  async updateFormAllocatedAsset(data: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      for (let key in data) {
        try {
          let id = `${key}:allocated-assets`;
          // Convert incoming asset IDs to the required format
          let finalAssetData = data[key].map(assetId => ({ id: assetId }));
          
          // The id goes into a regex, so it is escaped: an unescaped `.`,
          // `+` or `(` in a minted id would match the wrong store, or none.
          let checkUrl = `${this.scorpioUrl}/?idPattern=^${escapeForIdPattern(id)}$&type=https://industry-fusion.org/base/v0.1/urn-holder`;
          let response = await axios.get(checkUrl, {
            headers
          });

          if (response.data.length > 0) {
            let assetData = response.data[0];
            
            finalAssetData = [...finalAssetData, ...allocatedItems(assetData)];
          }

          // Remove duplicates based on asset ID
          finalAssetData = [...new Map(finalAssetData.map(item => [item.id, item])).values()];

          // One replace instead of delete-then-create.
          await replaceEntity(this.scorpioUrl, allocatedStore(id, finalAssetData), headers);
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
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    };
    let factoryId = '';
    for (const store of await this.findAll(token)) {
      const items = allocatedItems(store);
      if (!items.some((item) => item.id === assetId)) continue;
      factoryId = store.id.split(':allocated-assets')[0];
      await replaceEntity(this.scorpioUrl, allocatedStore(store.id, items.filter((item) => item.id !== assetId)), headers);
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

  async remove(id:string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const updateUrl = `${this.scorpioUrl}/${id}`;
      let response =  await axios.delete(updateUrl, { headers });
      return {
        status: response.status,
        data: response.data,
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