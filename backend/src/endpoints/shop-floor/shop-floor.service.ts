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

import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { shopFloorDescriptionDto } from './dto/shopFloorDescription.dto';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { AssetService } from '../asset/asset.service';
import axios from 'axios';
import { FactoryPdtCacheService } from '../factory-pdt-cache/factory-pdt-cache.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';

import { upstreamMessage } from '../../utils/upstream-error';
import { linkTargets, prepareForScorpio, replaceEntity, toLinks } from '../../utils/ngsi-ld';
@Injectable()
export class ShopFloorService {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCacheModel: Model<FactoryPdtCache>,
    private readonly factorySiteService: FactorySiteService,
    private readonly assetService: AssetService,
    private readonly factoryPdtCacheService: FactoryPdtCacheService
    ) {}

  async create(data: shopFloorDescriptionDto, token: string) {
    try {

      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };

      let checkUrl = `${this.scorpioUrl}?type=${data.type}&q=http://www.industry-fusion.org/schema%23floor_name==%22${data.properties['floor_name']}%22`;
      console.log("checkUrl",checkUrl)
      let shopFloorData = await axios.get(checkUrl, { headers });
      console.log("shopFloorData",shopFloorData)

      if(!shopFloorData.data.length){
        console.log("shopFloorData",shopFloorData)
        //fetch the last urn from scorpio and create a new urn
        const fetchLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:shopFloor-id-store`;
        console.log("fetchLastUrnUrl",fetchLastUrnUrl)
        
        try{
          const getLastUrn = await axios.get(fetchLastUrnUrl, {
            headers,
          });
        }
        catch(error){
          if (error.response && error.response.status === 404){
            const shopStore = {
              "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld",
              "id": "urn:ngsi-ld:shopFloor-id-store",
              "type": "https://industry-fusion.org/base/v0.1/urn-holder",
              "last-urn": {
                  "type": "Property",
                  "value": "urn:ngsi-ld:shopFloors:2:000"
              }
            }
            const response = await axios.post(this.scorpioUrl, prepareForScorpio(shopStore), {headers});
            if (response.status !== 201){
              throw new HttpException({
                errorCode: `FS_${response.status}`,
                message: upstreamMessage({ response })
              }, response.status);
            }
          } else if (error.response) {
            throw new HttpException({
              errorCode: `FS_${error.response.status}`,
              message: upstreamMessage(error)
            }, error.response.status);
          } else {
            throw new HttpException({
              errorCode: "FS_500",
              message: error.message
            }, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }
        
        let getLastUrn = await axios.get(fetchLastUrnUrl, {
            headers
        });

        getLastUrn = getLastUrn.data;
        console.log("getLastUrn.data",getLastUrn)
        let newUrn = '',
          lastUrn = {},
          lastUrnKey = '';
        lastUrn['@context'] = getLastUrn['@context'];
        for (let key in getLastUrn) {
          if (key.includes('last-urn')) {
            lastUrnKey = key;
            lastUrn[lastUrnKey] = getLastUrn[key];
            newUrn = getLastUrn[key]['value'].split(':')[4];
            newUrn = (parseInt(newUrn, 10) + 1)
              .toString()
              .padStart(newUrn.length, '0');
          }
        }

        //set the result to store in scorpio
        const result = {
          '@context':
            'https://industryfusion.github.io/contexts/v0.1/context.jsonld',
          id: `urn:ngsi-ld:shopFloors:2:${newUrn}`,
          type: data.type,
        };
        for (let key in data.properties) {
          let resultKey = 'http://www.industry-fusion.org/schema#' + key;
          if (key.includes('hasAsset')) {
            const links = toLinks(linkTargets({ type: 'Relationship', object: data.properties[key] }));
            if (links) result[resultKey] = links;
          } else {
            result[resultKey] = {
              type: "Property",
              value: data.properties[key]
            };
          }
        }
        // Check the shop floor before taking its id, so a refused write
        // does not use up a number.
        const shopFloor = prepareForScorpio(result, { label: `shop floor ${result.id}` });
        //update the last urn with the current urn in scorpio
        lastUrn[lastUrnKey].value = `urn:ngsi-ld:shopFloors:2:${newUrn}`;
        const updateLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:shopFloor-id-store/attrs`;
        await axios.patch(updateLastUrnUrl, prepareForScorpio(lastUrn, { requireId: false }), { headers });

        //store the template data to scorpio
        const response = await axios.post(this.scorpioUrl, shopFloor, { headers });
        return {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          id: result.id,
          floorName: result['http://www.industry-fusion.org/schema#floor_name']
        }
      } else{
        return {
          "success": false,
          "status": 409,
          "message": "shopFloor Name Already Exists"
        }
      }
    } catch (err) {
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

  async createShopFloor(data: any, token: string){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const response = await axios.post(this.scorpioUrl, prepareForScorpio(data, { label: `shop floor ${data?.id}` }), { headers });
      return {
        status: response.status,
        statusText: response.statusText,
      }
    }catch(err){
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

  async findAll(id: string, token: string) {
    try {
      const factoryData = await this.factorySiteService.findOne(id, token);
      
      const shopFloorData = [];
      for (const id of linkTargets(factoryData['http://www.industry-fusion.org/schema#hasShopFloor'])) {
        let data = await this.findOne(id, token);
        if (data) {
          shopFloorData.push(data);
        }
      }
      
      return shopFloorData;
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

  async findOne(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.get(url, { headers });
      if (response.data) {
        return response.data;
      } else {
        throw new NotFoundException('shop-floor not found');
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

  async updateAssets(data, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const responses = [];
      for (let key in data) {
        const shopFloorData = await this.findOne(key, token);
        let assetIds = data[key];
        let assetKey = 'http://www.industry-fusion.org/schema#hasAsset';
        const links = toLinks(assetIds);
        if (links) shopFloorData[assetKey] = links;
        else delete shopFloorData[assetKey];
        // One replace instead of delete-then-create of the shop floor.
        const response = await replaceEntity(this.scorpioUrl, shopFloorData, headers);
        responses.push(response);
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

  async update(id: string, data, token: string) {
    try {
      data['@context'] =
        'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld';
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      let flag = true;
      if(data["http://www.industry-fusion.org/schema#floor_name"]) {
        let floorName = data["http://www.industry-fusion.org/schema#floor_name"];
        let checkUrl = `${this.scorpioUrl}?type=${data.type}&q=http://www.industry-fusion.org/schema%23floor_name==%22${floorName}%22`;
        let shopFloorData = await axios.get(checkUrl, { headers });

        if(shopFloorData.data.length) {
          flag= false;
        }
      }
      if(flag) {
        const url = this.scorpioUrl + '/' + id + '/attrs';
        const response = await axios.post(url, prepareForScorpio(data, { requireId: false, label: `update for ${id}` }), { headers });
        return {
          status: response.status,
          data: response.data,
        };
      } else {
        return {
          "success": false,
          "status": 409,
          "message": "shopFloor Name Already Exists"
        }
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

  async remove(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.delete(url, { headers });
      return {
        status: response.status,
        data: response.data,
      };
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

  async updateReact(node: any, token: string) {
    try {
      let shopFloorobj = {}, assetObj = {}, factoryId = "";
      for(let i = 0; i < node.length; i++){
        let id = node[i].source;
        // React Flow node ids are `<kind>_<entity id>`. Match the node kind by
        // its prefix, never by text inside the entity id: this used to test
        // `includes('factories')`, which only worked while factory ids were
        // literally `urn:ngsi-ld:factories:2:NNN`. A differently-shaped id made
        // this branch silently false, so relation cleanup stopped running on
        // every flow edit with no error anywhere. The frontend already matches
        // by prefix (flow-editor.tsx), and this now agrees with it.
        if(node[i].source.startsWith('factory_')){
          let check = false;
          // Strip the prefix rather than splitting on "_": an id containing an
          // underscore would otherwise be truncated at the first one.
          factoryId = node[i].source.replace(/^factory_/, "");
          for(let j = i+1; j < node.length; j++) {
            if(node[j].source.includes(node[i].target)){
              check = true;
            }
          }
          if(!check){
            let shopFloorData = await this.findOne(node[i].target.split('_').pop(), token);
            shopFloorData['http://www.industry-fusion.org/schema#hasAsset'] = {
              type: 'Relationship',
              object: ''
            }

            let deleteResponse = await this.remove(node[i].target.split('_').pop(), token);
            if(deleteResponse.status == 200 || deleteResponse.status == 204){
              let response = await this.createShopFloor(shopFloorData, token);
              if(response['status'] == 200 || response['status'] == 201){
                continue;
              } else {
                return response;
              }
            }
          }
        }
        if(node[i].source.includes('shopFloor') && !shopFloorobj.hasOwnProperty(id.split('_').pop())){
          let key = id.split('_').pop();
          shopFloorobj[key] = shopFloorobj[key] ? shopFloorobj[key] : [];
          shopFloorobj[key].push(node[i].target.split('_')[1]);
          let check = false;
          for(let j = i+1; j < node.length; j++) {
            if(node[j].source === id){
              shopFloorobj[key].push(node[j].target.split('_')[1]);
            }
            if(node[i].target === node[j].source){
              check = true;
            }
          }
          if(!check){
            try {
              let assetData = await this.assetService.getAssetDataById(node[i].target.split('_')[1], token);
              for (const key in assetData){
                if (key.includes('has')){
                  assetData[key] = {
                    type: 'Relationship',
                    object: '',
                  }
                }
              }
              let deleteResponse = await this.assetService.deleteAssetById(node[i].target.split('_')[1], token);
              if(deleteResponse.status == 200 || deleteResponse.status == 204){
                let response = await this.assetService.setAssetData(assetData, token);
                if(response['status'] == 200 || response['status'] == 201){
                  continue;
                } else {
                  return response;
                }
              }
            } catch(err) {
              continue;
            }
          }
        }
        if(node[i].source.includes('asset') && !node[i].source.includes('relation')){
          let key = id.split('_')[1];
          assetObj[key] = assetObj[key] ? assetObj[key] : {};
          assetObj[key][node[i].target.split('_')[1]] = assetObj[key][node[i].target.split('_')[1]] ? assetObj[key][node[i].target.split('_')[1]] : [];
          for(let j = 0; j < node.length; j++) {
            if(node[j].source === node[i].target){
              assetObj[key][node[i].target.split('_')[1]].push(node[j].target.split('_')[1]);
            }
          }
        }
      }
      if(Object.keys(shopFloorobj).length && Object.keys(assetObj).length){
        let response = await this.updateAssets(shopFloorobj, token);
        // add shopfloor and factory in cache to assets attached to shopfloor
        await Promise.all(
          Object.keys(shopFloorobj).map(async(key) => {
            // need to remove shop_floor value for assets removed from the shopfloor
            // filter out assets which are matching with current shop_floor but not present in react flow
            const matchingAssetData = await this.factoryPdtCacheModel.find({ shop_floor: key }).lean();
            if(matchingAssetData.length) {
              const matchingAssetIds = matchingAssetData.map(asset => asset.id);
              const filteredAssetIds = matchingAssetIds.filter(id => !shopFloorobj[key].includes(id));
              await this.factoryPdtCacheModel.updateMany(
                {id: {$in: filteredAssetIds}},
                [
                  {
                    $set: {
                      shop_floor: {
                        $setDifference: ["$shop_floor", [key]]  // remove shop_floor for filtered assetIds
                      }
                    }
                  },
                  {
                    $set: {
                      factory_site: {
                        $cond: [
                          { $eq: ["$shop_floor", []] },  // set factory_site to "" when shop_floor becomes empty array after update
                          "",
                          "$factory_site"
                        ]
                      }
                    }
                  }
                ]
              )
            }
            await this.factoryPdtCacheService.updateFactoryAndShopFloor({assetIds: shopFloorobj[key], factory_site: factoryId, shop_floor: key});
          })
        )
        if(response.success){
          let assetResponse = await this.assetService.updateRelations(assetObj, token);
          return assetResponse;
        } 
      } else if(Object.keys(shopFloorobj).length || Object.keys(assetObj).length){
        if(Object.keys(shopFloorobj).length){
          let response = await this.updateAssets(shopFloorobj, token);
          // add shopfloor and factory in cache to assets attached to shopfloor
          await Promise.all(
            Object.keys(shopFloorobj).map(async(key) => {
              // need to remove shop_floor for assets removed from the shopfloor
              // filter out assets which are matching with current shop_floor but not present in react flow
              const matchingAssetData = await this.factoryPdtCacheModel.find({ shop_floor: key }).lean();
              if(matchingAssetData.length) {
                const matchingAssetIds = matchingAssetData.map(asset => asset.id);
                const filteredAssetIds = matchingAssetIds.filter(id => !shopFloorobj[key].includes(id));
                await this.factoryPdtCacheModel.updateMany(
                  {id: {$in: filteredAssetIds}},
                  [
                    {
                      $set: {
                        shop_floor: {
                          $setDifference: ["$shop_floor", [key]]   // remove shop_floor for filtered assetIds
                        }
                      }
                    },
                    {
                      $set: {
                        factory_site: {
                          $cond: [
                            { $eq: ["$shop_floor", []] },  // set factory_site to "" when shop_floor becomes empty array after update
                            "",
                            "$factory_site"
                          ]
                        }
                      }
                    }
                  ]
                )
              }
              await this.factoryPdtCacheService.updateFactoryAndShopFloor({assetIds: shopFloorobj[key], factory_site: factoryId, shop_floor: key});
            })
          )
         return response;
        } else {
          let response = await this.assetService.updateRelations(assetObj, token);
          return response;
        }
      } else {
        return {
          success: true,
          status: 200,
          message: 'react flow reset successfully'
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

  async deleteScript(node: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      for(let i = 0; i < node.length; i++){
        try {
          let id = node[i].id;
          if(id.includes('shopFloor')){
            let response = await this.remove(id.split('_').pop(), token);
            if(response['status'] == 200 || response['status'] == 204){
              continue;
            } else {
              return response;
            }
          }
          if(id.includes('asset')){
            let assetData = await this.assetService.getAssetDataById(id.split('_')[1], token);
            if(Object.keys(assetData).length > 0){
              // Clear the product's component links: NGSI-LD has no empty link,
              // so the link attributes are removed (the template still lists the slots).
              for (const key in assetData){
                const first = Array.isArray(assetData[key]) ? assetData[key][0] : assetData[key];
                if (key.includes('has') && first?.type === 'Relationship'){
                  delete assetData[key];
                }
              }
              await replaceEntity(this.scorpioUrl, assetData, headers);
              continue;
            }else{
              continue;
            }
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
      }
      return {
        status: 204,
        message: 'Delete Successfully'
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
}
