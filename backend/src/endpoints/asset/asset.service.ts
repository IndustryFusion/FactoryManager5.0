import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplateDescriptionDto } from '../templates/dto/templateDescription.dto';
import { TemplatesService } from '../templates/templates.service';
import axios from 'axios';

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

  async setAssetData(id : string, data: TemplateDescriptionDto, token: string) {
    try {
      //fetch the last urn from scorpio and create a new urn
      const fetchLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:id-store`;
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let getLastUrn = await axios.get(fetchLastUrnUrl, {
        headers
      });
      getLastUrn = getLastUrn.data;
      let newUrn = '', lastUrn = {}, lastUrnKey = '';
      lastUrn["@context"] = getLastUrn["@context"];
      for(let key in getLastUrn) {
        if(key.includes('last-urn')) {
          lastUrnKey = key;
          lastUrn[lastUrnKey] = getLastUrn[key];
          newUrn = getLastUrn[key]['value'].split(':')[4];
          newUrn = (parseInt(newUrn, 10) + 1).toString().padStart(newUrn.length, "0");
        }
      }

      //set the result to store in scorpio
      const result = {
        "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
        "id": `urn:ngsi-ld:asset:2:${newUrn}`,
        "type": data.type,
        "templateId": id
      }
      for(let key in data.properties) {
        let resultKey = "http://www.industry-fusion.org/schema#" + key;
        if(key.includes("has")) {
          let obj = {
            type: "Relationship",
            object: data.properties[key]
          }
          result[resultKey] = obj;
          } else {
          result[resultKey] = data.properties[key];
        }
      }
      //update the last urn with the current urn in scorpio
      lastUrn[lastUrnKey].value = `urn:ngsi-ld:asset:2:${newUrn}`;
      const updateLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:id-store/attrs`;
      await axios.patch(updateLastUrnUrl, lastUrn, {headers});

      //store the template data to scorpio
      const response = await axios.post(this.scorpioUrl, result, {headers});
      console.log('response ',response.statusText);
      return {
        id: result.id,
        status: response.status,
        statusText: response.statusText,
        data: response.data
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