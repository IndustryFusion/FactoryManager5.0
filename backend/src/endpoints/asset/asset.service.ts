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

  async setAssetData( data: ImportAssetDto[], token: string ) {
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
      throw err;
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
      for(let key in data) {
        let assetData = data[key];
        console.log(assetData);
        let finalObj = {};
        for(let relationKey in assetData) {
          console.log(relationKey);
          let finalKey = "http://www.industry-fusion.org/schema#" + relationKey;
          finalObj[finalKey] = {
            "type": "Relationship",
            "object": assetData[relationKey]
          }
          console.log(finalObj);
        }
        await this.updateAssetById(key, finalObj, token);
      }
      return {
        status: "200",
        message: "Successfully updated relationships of assets"
      }
    }catch(err) {
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