import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import axios from 'axios';
import { ImportAssetDto } from './dto/importAsset.dto';

@Injectable()
export class AssetService {
  constructor(private readonly templatesService: TemplatesService) {}
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
        for (let i = 0; i < data.length; i++) {
          response = await axios.post(this.scorpioUrl, data[i], {headers});
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
          if(relationArray.length > 1){
            let classValue = assetData[finalKey].class;
            assetData[finalKey] = [];
            for (let i = 0; i < relationArray.length; i++) {
              assetData[finalKey].push({
                type: 'Relationship',
                object: relationArray[i],
                class: classValue
              });
            }
          }else{
            assetData[finalKey].object = relationArray[0];
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

  async deleteAssetRelation(assetId: string, token: string){
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      // Delete AssetId from Global Allocated Asset
      let globalAssetUrl = `${this.scorpioUrl}/urn:ngsi-ld:global-allocated-assets-store`;
      let globalAssets = await axios.get(globalAssetUrl, {headers});
      globalAssets = globalAssets.data["http://www.industry-fusion.org/schema#last-data"].object;
      if(Array.isArray(globalAssets) && globalAssets.includes(assetId)){
        const newArray = globalAssets.filter(item => item !== assetId);
        let deleteGlobalResponse = await this.deleteAssetById("urn:ngsi-ld:global-allocated-assets-store",token);
        if(deleteGlobalResponse['status'] == 200 || deleteGlobalResponse['status'] == 204) {
          const data = {
            "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
            "id": "urn:ngsi-ld:global-allocated-assets-store",
            "type": "urn-holder",
            "http://www.industry-fusion.org/schema#last-data": {
              type: 'Property',
              object: newArray
            }
          };
          await axios.post(this.scorpioUrl, data, {headers});
        }
      }

      // Delete AssetId From Factory Specific Allocated Asset
      let factoryAssetsUrl = `${this.scorpioUrl}?q=http://www.industry-fusion.org/schema%23last-data==%22${assetId}%22`; 
      const factoryAssetsResponse = await axios.get(factoryAssetsUrl, {headers});
      if(factoryAssetsResponse.data.length > 0){
        let lastData = factoryAssetsResponse.data["http://www.industry-fusion.org/schema#last-data"].object;
        const newArray = lastData.filter(item => item !== assetId);
        factoryAssetsResponse.data["http://www.industry-fusion.org/schema#last-data"].object = newArray;
        await axios.post(this.scorpioUrl, factoryAssetsResponse.data, {headers});
      }

      // Remove AssetId From HasAsset Relation Of ShopFloor
      let shopFloorUrl = `${this.scorpioUrl}?q=http://www.industry-fusion.org/schema%23hasAsset==%22${assetId}%22`; 
      const shopFloorResponse = await axios.get(shopFloorUrl, {headers});
      if(shopFloorResponse.data.length > 0){
        let hasAssetData = shopFloorResponse.data["http://www.industry-fusion.org/schema%23hasAsset"];
        const newArray = hasAssetData.filter(item => item.object !== assetId);
        shopFloorResponse.data["http://www.industry-fusion.org/schema%23hasAsset"] = newArray; 
        let deleteResponse = this.deleteAssetById(shopFloorResponse.data.id, token);
        if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
          await axios.post(this.scorpioUrl, shopFloorResponse.data, { headers });
        }
      }

      // Delete Asset From Scorpio
      let assetData = await this.getAssetDataById(assetId, token);
      let assetCategory = assetData["http://www.industry-fusion.org/schema#asset_category"].split(" ").pop(); 
      assetCategory = assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1);
      let relationKey = `http://www.industry-fusion.org/schema%23has${assetCategory}`;
      let url = `${this.scorpioUrl}?q=${relationKey}==%22${assetId}%22`; 
      const response = await axios.get(url, {headers});
      if(response.data.length > 0) {
        // Delete Asset From Parent Relation
        let relationData = response.data[relationKey];
        const newArray = relationData.filter(item => item !== assetId);
        response.data[relationKey] = newArray;
        let deleteResponse = this.deleteAssetById(response.data.id, token);
        if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
          const createResponse = await axios.post(this.scorpioUrl, response.data, { headers });
          return {
            status: createResponse.status,
            data: createResponse.data
          }
        }
      }else{
        // Delete AssetId From Scorpio
        const url = this.scorpioUrl + '/' + assetId; 
        let deleteResponse = await axios.delete(url, {headers});
        return {
          status: deleteResponse.status,
          data: deleteResponse.data
        }
      }
    }catch(err){
      throw err;
    }
  }
}