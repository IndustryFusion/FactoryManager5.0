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

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AssetService } from '../asset/asset.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService,
    private readonly factorySiteService: FactorySiteService
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
        const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/ld+json',
          'Accept': 'application/ld+json'
        };
        let id = `${factoryId}:allocated-assets`;
        const data = {
          "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
          "id": id,
          "type": "urn-holder",
          "http://www.industry-fusion.org/schema#last-data": {
             value: {
              items: formattedAssetArr
            }
          }
        };
        let response = await axios.post(this.scorpioUrl, data, {headers});
        await this.updateGlobal(token)
        return {
          status: response.status,
          statusText: response.statusText
        }
      } else {
        return {
          status: true,
          statusText: 'No Allocated Assets Available'
        }
      }
    } catch(err){
      return err;
    }
  }
  
async createGlobal(token: string) {
  try {
    let allocatedAssetData = await this.findAll(token);
    console.log("allocatedAssetData createGlobal",allocatedAssetData)
    let assetArr = [];
    
    for(let i = 0; i < allocatedAssetData.length; i++) {    
      const lastData = allocatedAssetData[i]["http://www.industry-fusion.org/schema#last-data"];
      
      // Only process if it's a Property type with items
      if (lastData.type === "Property" && 
          lastData.value && 
          lastData.value["https://industry-fusion.org/base/v0.1/items"]) {
        
        const items = lastData.value["https://industry-fusion.org/base/v0.1/items"];
        if (Array.isArray(items)) {
          assetArr = [...assetArr, ...items];
        }
      }
    }

    // Remove duplicates while preserving object structure
    assetArr = Array.from(
      new Set(assetArr.map(item => JSON.stringify(item)))
    ).map(item => JSON.parse(item));

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    };
    // console.log("assetArr",assetArr)
    const data = {
      "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
      "id": "urn:ngsi-ld:global-allocated-assets-store",
      "type": "urn-holder",
      "http://www.industry-fusion.org/schema#last-data": {
        type: "Property",
        value: {
          items: assetArr
        }
      }
    };

    let response = await axios.post(this.scorpioUrl, data, {headers});
    return {
      status: response.status,
      statusText: response.statusText
    }
  } catch(err) {
    return err;
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
      let response = await axios.get(fetchUrl, {
        headers
      });

      let assetIds = response.data["http://www.industry-fusion.org/schema#last-data"]?.value?.["https://industry-fusion.org/base/v0.1/items"] || [];
  
      let finalArray = [];
      if (Array.isArray(assetIds) && assetIds.length > 0) {
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i].id;
          const assetData = await this.assetService.getAssetDataById(id, token);
          const finalData = {
            id,
            product_name: assetData[Object.keys(assetData).find(key => key.includes("product_name"))]?.value, 
            asset_category: assetData[Object.keys(assetData).find(key => key.includes("asset_category"))]?.value 
          };
          finalArray.push(finalData);
        }
      } else if(assetIds && assetIds.includes('urn')){
        const assetData = await this.assetService.getAssetDataById(assetIds, token);
        const finalData = {
          id: assetIds,
          product_name: assetData[Object.keys(assetData).find(key => key.includes("product_name"))]?.value,
          asset_category: assetData[Object.keys(assetData).find(key => key.includes("asset_category"))]?.value 
        };
        finalArray.push(finalData);
      }
      return finalArray;
    } catch(err) {
      if (err.response && err.response.status === 404) {
        return [];
      } else {
        return err;
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
      const fetchUrl = `${this.scorpioUrl}/?idPattern=urn:ngsi-ld:.*.:allocated-assets&type=https://industry-fusion.org/base/v0.1/urn-holder`;

      let response = await axios.get(fetchUrl, {
        headers
      });
      // console.log("findAll",response.data) 
      return response.data;
    } catch(err) {
      return err;
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
        const factorySpecificAssets = allocatedAssetData[i]["http://www.industry-fusion.org/schema#last-data"].object;
        finalData[factoryName] = [];
        if(Array.isArray(factorySpecificAssets)){
          for(let i = 0; i < factorySpecificAssets.length; i++){
            let assetData = await this.assetService.getAssetDataById(factorySpecificAssets[i], token);
            const productNameKey = Object.keys(assetData).find(key => key.toLowerCase().includes('product_name'));
            if (productNameKey && assetData[productNameKey].value) {
              finalData[factoryName].push(assetData[productNameKey].value);
            }
          }
        } else if(factorySpecificAssets !== "json-ld-1.1") {
          let assetData = await this.assetService.getAssetDataById(factorySpecificAssets, token);
          const productNameKey = Object.keys(assetData).find(key => key.toLowerCase().includes('product_name'));
          if (productNameKey && assetData[productNameKey].value) {
            finalData[factoryName].push(assetData[productNameKey].value);
          }
        }
      }
      return finalData;
    }catch(err){
      return err;
    }
  }

  async getGlobalAllocatedAssets(token: string) {
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      //fetch the allocated assets from scorpio
      const fetchUrl = `${this.scorpioUrl}/urn:ngsi-ld:global-allocated-assets-store`;
      let response = await axios.get(fetchUrl, {
        headers
      });
     if (response.data) {
      console.log("global assets", response.data);
      
      // Extract the items array from the nested structure
      const lastData = response.data["http://www.industry-fusion.org/schema#last-data"];
      if (lastData?.value?.["https://industry-fusion.org/base/v0.1/items"]) {
        const items = lastData.value["https://industry-fusion.org/base/v0.1/items"];
        
        // Return array of asset IDs
        if (Array.isArray(items)) {
          return items.map(item => item.id).filter(Boolean);
        }
      }
      
      // Return empty array if no items found
      return [];
    }
    
    return [];
    
  } catch (err) {
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    };
    
    if (err.response && err.response.status === 404) {
      await this.createGlobal(token);
      return await this.getGlobalAllocatedAssets(token);
    } else {
      console.error('Error fetching global allocated assets:', err);
      return [];
    }
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
      return err;
    }
  }

  async updateFormAllocatedAsset(data: any, token: string){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      for(let key in data){
        let id = `${key}:allocated-assets`;
        let finalAssetData = data[key];
        let checkUrl = `${this.scorpioUrl}/?idPattern=${id}&type=https://industry-fusion.org/base/v0.1/urn-holder`;
        let response = await axios.get(checkUrl, {
          headers
        });
        if(response.data.length > 0){
          let assetData =  response.data[0];
          //  const formattedAssetArr = assetArr.map(id => ({ id }));
          let getAllocatedAssets = assetData["http://www.industry-fusion.org/schema#last-data"].object;
          if(Array.isArray(getAllocatedAssets)){
            finalAssetData = [...finalAssetData, ...getAllocatedAssets];
          }else{
            finalAssetData = [...finalAssetData, getAllocatedAssets];
          }
          await this.remove(id, token);
        }
        finalAssetData = [...new Set(finalAssetData)];
        const finalData = {
          "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
          "id": id,
          "type": "urn-holder",
          "http://www.industry-fusion.org/schema#last-data": {
            type: 'Property',
            object: finalAssetData
          }
        };
        await axios.post(this.scorpioUrl, finalData, {headers});
      }
      await this.updateGlobal(token);
      return {
        status: 201,
        message: 'Factory Allocated Assets Created successful',
      };
    }catch(err){
      return err;
    }
  }

  async updateGlobal(token: string) {
    try{
      let deleteResponse = await this.remove("urn:ngsi-ld:global-allocated-assets-store",token);
      if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
        let response =  await this.createGlobal(token);
        return {
          status: response.status,
          data: response.data,
        };
      }
    } catch(err) {
      return err;
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
      return err;
    }
  }
}