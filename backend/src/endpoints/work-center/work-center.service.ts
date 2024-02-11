import { Injectable, NotFoundException } from '@nestjs/common';
import { workCenterDescriptionDto } from './dto/workCenterDescription.dto';
import axios from 'axios';

@Injectable()
export class WorkCenterService {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  async create(data: workCenterDescriptionDto, token: string) {
    try {
      //fetch the last urn from scorpio and create a new urn
      const fetchLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:workCenter-id-store`;
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
        "id": `urn:ngsi-ld:workCenter:2:${newUrn}`,
        "type": data.type
      }
      for(let key in data.properties) {
        let resultKey = "http://www.industry-fusion.org/schema#" + key;
        if(key.includes("hasAsset")) {
          newUrn = (parseInt(newUrn, 10) + 1).toString().padStart(newUrn.length, "0");
          let obj = {
            type: "Relationship",
            object: ""
          }
          result[resultKey] = obj;
        } else {
          result[resultKey] = data.properties[key];
        }
      }
      //update the last urn with the current urn in scorpio
      lastUrn[lastUrnKey].value = `urn:ngsi-ld:workCenter:2:${newUrn}`;
      const updateLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:workCenter-id-store/attrs`;
      await axios.patch(updateLastUrnUrl, lastUrn, {headers});
  
      //store the template data to scorpio
      const response = await axios.post(this.scorpioUrl, result, {headers});
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }
    } catch (err) {
      console.log('err ',err);
      throw err;
    }
  }

  async findAll(token: string) {
    try {
      const shopFloorData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      let shopFloorType = "https://industry-fusion.org/types/v0.1/shopFloor";
      const url = this.scorpioUrl + '/?type=' + shopFloorType;
      const response = await axios.get(url, {headers});
      if(response.data.length > 0) {
        response.data.forEach(data => {
          shopFloorData.push(data);
        });
      }
      return shopFloorData;
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async findOne(id: string, token: string) {
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
        throw new NotFoundException('shop-floor not found');
      }
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async update(id, data, token: string) {
    try {
      data['@context'] = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld";
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id + '/attrs';
      const response = await axios.patch(url, data, {headers});
      return {
        status: response.status,
        data: response.data
      }
    } catch(err) {
      throw err;
    }
  }

  async remove(id: string, token: string) {
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
