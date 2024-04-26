import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AssetService } from '../asset/asset.service';
import { ReactFlowService } from '../react-flow/react-flow.service';

@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService
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
      assetArr = [...new Set(assetArr)];
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
            type: 'Property',
            object: assetArr
          }
        };
        let response = await axios.post(this.scorpioUrl, data, {headers});
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
    try{
      let allocatedAssetData = await this.findAll(token);
      let assetArr = [];
      for(let i = 0; i < allocatedAssetData.length; i++){    
        const factorySpecificData = allocatedAssetData[i]["http://www.industry-fusion.org/schema#last-data"].object; 
        if(Array.isArray(factorySpecificData)){
          assetArr = [...assetArr, ...factorySpecificData];
        } else {
          assetArr.push(factorySpecificData);
        }
      }
      assetArr = [...new Set(assetArr)];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      const data = {
        "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
        "id": "urn:ngsi-ld:global-allocated-assets-store",
        "type": "urn-holder",
        "http://www.industry-fusion.org/schema#last-data": {
          type: 'Property',
          object: assetArr
        }
      };
      let response = await axios.post(this.scorpioUrl, data, {headers});
      return {
        status: response.status,
        statusText: response.statusText
      }
    }catch(err){
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
     
      let assetIds = response.data["http://www.industry-fusion.org/schema#last-data"].object;
      let finalArray = [];
      if (Array.isArray(assetIds) && assetIds.length > 0) {
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          const assetData = await this.assetService.getAssetDataById(id, token);
          const finalData = {
            id,
            product_name: assetData['http://www.industry-fusion.org/schema#product_name']?.value,
            asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']?.value
          };
          finalArray.push(finalData);
        }
      } else if(assetIds && assetIds.includes('urn')){
        const assetData = await this.assetService.getAssetDataById(assetIds, token);
        const finalData = {
          id: assetIds,
          product_name: assetData['http://www.industry-fusion.org/schema#product_name']?.value,
          asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']?.value
        };
        finalArray.push(finalData);
      }
      return finalArray;
    } catch(err) {
      if (err.response && err.response.status === 404) {
        console.log('No data found from fetchUrl');
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
    
      return response.data;
    } catch(err) {
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
      if(response.data){
        return response.data["http://www.industry-fusion.org/schema#last-data"].object;
      }
    } catch(err) {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      if (err.response && err.response.status === 404) {
        await this.createGlobal(token);
        return await this.getGlobalAllocatedAssets(token);
      } else {
        return err;
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
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    };
    for(let key in data){
      let id = `${key}:allocated-assets`;
      const finalData = {
        "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
        "id": id,
        "type": "urn-holder",
        "http://www.industry-fusion.org/schema#last-data": {
          type: 'Property',
          object: data[key]
        }
      };
      await axios.post(this.scorpioUrl, finalData, {headers});
    }
    return {
      status: 201,
      message: 'Factory Allocated Assets Created successful',
    };
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