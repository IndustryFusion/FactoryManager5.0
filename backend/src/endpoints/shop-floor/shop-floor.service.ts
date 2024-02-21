import { Injectable, NotFoundException } from '@nestjs/common';
import { shopFloorDescriptionDto } from './dto/shopFloorDescription.dto';
import { FactorySiteService } from '../factory-site/factory-site.service';
import axios from 'axios';

@Injectable()
export class ShopFloorService {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(private readonly factorySiteService: FactorySiteService) {}

  async create(data: shopFloorDescriptionDto, token: string) {
    try {
      //fetch the last urn from scorpio and create a new urn
      const fetchLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:shopFloor-id-store`;
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json',
      };
      let getLastUrn = await axios.get(fetchLastUrnUrl, {
        headers,
      });
      getLastUrn = getLastUrn.data;
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
          result[resultKey] = data.properties[key];
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
      };
    } catch (err) {
      console.log('err ', err);
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
        shopFloorData[assetKey] = [];
        for(let i=0; i < assetIds.length; i++) {
          shopFloorData[assetKey].push({
            type: 'Relationship',
            object: assetIds[i]
          })
        }
        console.log('shopFloorData ',shopFloorData);
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
      const url = this.scorpioUrl + '/' + id + '/attrs';
      const response = await axios.post(url, data, { headers });
      return {
        status: response.status,
        data: response.data,
      };
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
}