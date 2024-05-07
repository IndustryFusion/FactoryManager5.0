import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import axios from 'axios';
import { ImportAssetDto } from './dto/importAsset.dto';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
@Injectable()
export class AssetService {
  constructor(
    private readonly templatesService: TemplatesService,
  ) {}
  private readonly scorpioUrl = process.env.SCORPIO_URL;

  async getAssetData(token: string) {
    try {
      const templateData = [];
      const templates = await this.templatesService.getTemplates();
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      for(let i = 0; i < templates.length; i++) {
        let template = templates[i];
        let id = Buffer.from(template.id, 'base64').toString('utf-8')
        const url = this.scorpioUrl + '?type=' + id;
        const response = await axios.get(url, {headers});
        if(response.data.length > 0) {
          response.data.forEach(data => {
            templateData.push(data);
          });
        }
      }
      return templateData;
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
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
      const response = await axios.get(url, {headers});
      if(response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
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
      const response = await axios.get(url, {headers});
      if(response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
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
      const response = await axios.get(url, {headers});
      if(response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async getAssetIds(token: string) {
    try {
      const templateData = [];
      const templates = await this.templatesService.getTemplates();
      // console.log('templates ',templates);
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      for(let i = 0; i < templates.length; i++) {
        let template = templates[i];
        let id = Buffer.from(template.id, 'base64').toString('utf-8')
        const url = this.scorpioUrl + '?type=' + id;
        const response = await axios.get(url, {headers});
        if(response.data.length > 0) {
          response.data.forEach(data => {
            templateData.push(data.id);
          });
        }
      }
      return templateData;
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async getParentIds(assetId: string, assetCategory: string, token: string){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      assetCategory = assetCategory.split(" ").pop(); 
      assetCategory = assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1); 
      let relationKey = `http://www.industry-fusion.org/schema%23has${assetCategory}`;
      let url = `${this.scorpioUrl}?q=${relationKey}==%22${assetId}%22`;
      console.log('url ',url);
      const response = await axios.get(url, {headers});
      let assetData = [];
      if(response.data.length > 0) {
        response.data.forEach(data => {
          assetData.push({
              id: data['id'],
              product_name: data['http://www.industry-fusion.org/schema#product_name'],
              asset_category: data['http://www.industry-fusion.org/schema#asset_category']
          });
        });
      }
      return assetData;
    }catch(err){
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async setAssetData( data: any, token: string ) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      // sending multiple requests to scorpio to save the asset array
      let response;
      try{
        if(Array.isArray(data)){
          for (let i = 0; i < data.length; i++) {
            response = await axios.post(this.scorpioUrl, data[i], {headers});
          }
        } else {
          response = await axios.post(this.scorpioUrl, data, {headers});
        }
        return {
          status: response.status,
          statusText: response.statusText,
        }
      }
      catch(err){
        return {
          status: 500,
          statusText: err
        }
      }
      
      return {
        status: response.status,
        statusText: response.statusText
      }
    } catch (err) {
      throw ('files to upload new asset' + err);
    }
  }

  async updateAssetById(id: string, data, token: string) {
    try {
      data['@context'] = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld";
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id + '/attrs';
      const response = await axios.post(url, data, {headers});
      return {
        status: response.status,
        data: response.data
      }
    } catch(err) {
      throw new Error('failed to update asset ' + err);
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
        let relationData = data[key];
        for (let relationKey in relationData) {
          let finalKey = 'http://www.industry-fusion.org/schema#' + relationKey;
          let relationArray = relationData[relationKey];
          if(relationArray.length > 0){
            assetData[finalKey] = [];
            for (let i = 0; i < relationArray.length; i++) {
              assetData[finalKey].push({
                type: 'Relationship',
                object: relationArray[i],
              });
            }
          }else{
            assetData[finalKey] = {
              type: 'Relationship',
              object: ''
            }
          }
        }
        console.log('assetData ', assetData);

        const deleteResponse = await this.deleteAssetById(key, token);
        console.log('deleteResponse ', deleteResponse);
        if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
          const response = await axios.post(this.scorpioUrl, assetData, { headers });
          console.log('create response ', response['status']);
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

  async deleteAssetById(id: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.delete(url, {headers});
      return {
        status: response.status,
        data: response.data
      }
    } catch (err) {
      throw err;
    }
  }

  async deleteAssetRelation(assetId: string, token: string, reactFlowService: ReactFlowService, allocatedAssetService: AllocatedAssetService){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      // Delete AssetId From Factory Specific Allocated Asset
      let factoryAssetsUrl = `${this.scorpioUrl}?q=http://www.industry-fusion.org/schema%23last-data==%22${assetId}%22`; 
      const factoryAssetsResponse = await axios.get(factoryAssetsUrl, {headers});
      console.log('factoryAssetsResponse ',factoryAssetsResponse.data)
      if(factoryAssetsResponse.data.length > 0){
        let lastData = factoryAssetsResponse.data[0]["http://www.industry-fusion.org/schema#last-data"].object;
        console.log('lastData ',lastData)
        if(Array.isArray(lastData)){
          const newArray = lastData.filter(item => item !== assetId);
          console.log('newArray ',newArray)
          factoryAssetsResponse.data[0]["http://www.industry-fusion.org/schema#last-data"].object = newArray;
        }else{
          factoryAssetsResponse.data[0]["http://www.industry-fusion.org/schema#last-data"].object = '';
        }
        let deleteFactoryResponse = await this.deleteAssetById(factoryAssetsResponse.data[0].id, token);
        if(deleteFactoryResponse['status'] == 200 || deleteFactoryResponse['status'] == 204) {
          await axios.post(this.scorpioUrl, factoryAssetsResponse.data[0], { headers });

          //Update React Flow for Allocated Factory
          let factoryId = factoryAssetsResponse.data[0].id.split(':allocated-assets')[0];
          await reactFlowService.findFactoryAndShopFloors(factoryId, token);
        }
      }

      // Update Global Allocated Assets
      await allocatedAssetService.updateGlobal(token);

      // Remove AssetId From HasAsset Relation Of ShopFloor
      let shopFloorUrl = `${this.scorpioUrl}?q=http://www.industry-fusion.org/schema%23hasAsset==%22${assetId}%22`; 
      const shopFloorResponse = await axios.get(shopFloorUrl, {headers});
      console.log('shopFloorResponse ',shopFloorResponse.data)
      if(shopFloorResponse.data.length > 0){
        let hasAssetData = shopFloorResponse.data[0]["http://www.industry-fusion.org/schema#hasAsset"];
        console.log('hasAssetData ',hasAssetData);
        if(Array.isArray(hasAssetData)){
          const newArray = hasAssetData.filter(item => item.object !== assetId);
          shopFloorResponse.data[0]["http://www.industry-fusion.org/schema#hasAsset"] = newArray; 
        }else{
          shopFloorResponse.data[0]["http://www.industry-fusion.org/schema#hasAsset"] = {
            type: 'Relationship',
            object: ''
          }
        }
        let deleteResponse = await this.deleteAssetById(shopFloorResponse.data[0].id, token);
        if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
          await axios.post(this.scorpioUrl, shopFloorResponse.data[0], { headers });
        }
      }

      // Delete Asset From Scorpio
      let assetData = await this.getAssetDataById(assetId, token);
      let assetCategory = assetData["http://www.industry-fusion.org/schema#asset_category"].value.split(" ").pop(); 
      console.log('assetCategory ',assetCategory)
      assetCategory = assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1);
      let urlKey = `http://www.industry-fusion.org/schema%23has${assetCategory}`;
      let relationKey = `http://www.industry-fusion.org/schema#has${assetCategory}`;
      let url = `${this.scorpioUrl}?q=${urlKey}==%22${assetId}%22`; 
      const response = await axios.get(url, {headers});
      console.log('response ',response.data)
      if(response.data.length > 0) {
        // Delete Asset From Parents Relation
        for(let i = 0; i < response.data.length; i++){
          let relationData = response.data[i][relationKey];
          console.log('relationData ',relationData);
          if(Array.isArray(relationData)){
            const newArray = relationData.filter(item => item.object !== assetId);
            response.data[i][relationKey] = newArray;
          }else{
            response.data[i][relationKey] = {
              type: 'Relationship',
              object: ''
            }
          }
          let deleteResponse = await this.deleteAssetById(response.data[i].id, token);
          if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
            await axios.post(this.scorpioUrl, response.data[i], { headers });
          }
        }
      }

      // Delete AssetId From Scorpio
      const finalUrl = this.scorpioUrl + '/' + assetId; 
      let deleteResponse = await axios.delete(finalUrl, {headers});
      return {
        status: deleteResponse.status,
        data: deleteResponse.data
      }
    }catch(err){
      throw err;
    }
  }
}