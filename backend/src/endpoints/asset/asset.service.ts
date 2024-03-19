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
      console.log('templates ',templates);
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
      console.log('templates ',templates);
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
          assetData[finalKey] = [];
          let relationArray = relationData[relationKey];
          for (let i = 0; i < relationArray.length; i++) {
            assetData[finalKey].push({
              type: 'Relationship',
              object: relationArray[i],
            });
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
}