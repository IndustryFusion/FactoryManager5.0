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

import { Injectable, NotFoundException } from '@nestjs/common';
import { shopFloorDescriptionDto } from './dto/shopFloorDescription.dto';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { AssetService } from '../asset/asset.service';
import axios from 'axios';
import { FactoryPdtCacheService } from '../factory-pdt-cache/factory-pdt-cache.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';

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
            const response = await axios.post(this.scorpioUrl, shopStore, {headers});
            if (response.status !== 201){
              return {
                "success": false,
                "status": 500,
                "message": "Initial Shopfloor URN holder creation failed"
              }
            }
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
            let obj = {
              type: 'Relationship',
              object: data.properties[key],
            };
            result[resultKey] = obj;
          } else {
            result[resultKey] = {
              type: "Property",
              value: data.properties[key]
            };
          }
        }
        //update the last urn with the current urn in scorpio
        lastUrn[lastUrnKey].value = `urn:ngsi-ld:shopFloors:2:${newUrn}`;
        const updateLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:shopFloor-id-store/attrs`;
        await axios.patch(updateLastUrnUrl, lastUrn, { headers });

        //store the template data to scorpio
        const response = await axios.post(this.scorpioUrl, result, { headers });
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
      throw err;
    }
  }

  async createShopFloor(data: any, token: string){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      const response = await axios.post(this.scorpioUrl, data, { headers });
      return {
        status: response.status,
        statusText: response.statusText,
      }
    }catch(err){
      throw err;
    }
  }

  async findAll(id: string, token: string) {
    try {
      const factoryData = await this.factorySiteService.findOne(id, token);
      
      const shopFloorIds = factoryData['http://www.industry-fusion.org/schema#hasShopFloor'];
      const shopFloorData = [];
      if (Array.isArray(shopFloorIds) && shopFloorIds.length > 0) {
        for (let i = 0; i < shopFloorIds.length; i++) {
          let id = shopFloorIds[i].object;
          if (id.includes('urn')) {
            let data = await this.findOne(id, token);
            if (data) {
              shopFloorData.push(data);
            }
          }
        }
      } else if (shopFloorIds.object.includes('urn')) {
        let data = await this.findOne(shopFloorIds.object, token);
        if (data) {
          shopFloorData.push(data);
        }
      }
      
      return shopFloorData;
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
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
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
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
        if(assetIds.length > 0){
          shopFloorData[assetKey] = [];
          for(let i=0; i < assetIds.length; i++) {
            shopFloorData[assetKey].push({
              type: 'Relationship',
              object: assetIds[i]
            })
          }
        }else{
          shopFloorData[assetKey] = {
            type: 'Relationship',
            object: ''
          }
        }
        const deleteResponse = await this.remove(key, token);
        if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
          const response = await axios.post(this.scorpioUrl, shopFloorData, { headers });
          responses.push(response);
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
      throw err;
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
        const response = await axios.post(url, data, { headers });
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
      throw err;
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
      throw err;
    }
  }

  async updateReact(node: any, token: string) {
    try {
      let shopFloorobj = {}, assetObj = {}, factoryId = "";
      for(let i = 0; i < node.length; i++){
        let id = node[i].source;
        if(node[i].source.includes('factories')){
          let check = false;
          factoryId = node[i].source.split("_")[1];
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
                { $pull: { shop_floor: key } }
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
                  { $pull: { shop_floor: key } }
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
      throw err;
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
          for (const key in assetData){
            if (key.includes('has')){
              assetData[key] = {
                type: 'Relationship',
                object: ''
              }
            }
          }
          const deleteResponse = await this.assetService.deleteAssetById(id.split('_')[1], token);
          if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
            await axios.post(this.scorpioUrl, assetData, { headers });
            continue;
          }else{
            return deleteResponse;
          }
          }else{
            continue;
          }
        }
      }
      return {
        status: 204,
        message: 'Delete Successfully'
      }
    } catch(err){
      throw err;
    }
  }
}
