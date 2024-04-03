import { Injectable, NotFoundException } from '@nestjs/common';
import { FactorySiteDescriptionDto } from './dto/factorySiteDescription.dto';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import axios from 'axios';
@Injectable()
export class FactorySiteService {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  async create(data: FactorySiteDescriptionDto, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let checkUrl = `${this.scorpioUrl}?type=${data.type}&q=http://www.industry-fusion.org/schema%23factory_name==%22${data.properties['factory_name']}%22`;
      let factoryData = await axios.get(checkUrl, { headers });
      if(!factoryData.data.length){
        //fetch the last urn from scorpio and create a new urn
        const fetchLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:factory-id-store`;
        
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
          "id": `urn:ngsi-ld:factories:2:${newUrn}`,
          "type": data.type
        }
        for(let key in data.properties) {
          let resultKey = "http://www.industry-fusion.org/schema#" + key;
          if(key.includes("hasShopFloor")) {
            let obj = {
              type: "Relationship",
              object: data.properties[key]
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
        lastUrn[lastUrnKey].value = `urn:ngsi-ld:factories:2:${newUrn}`;
        const updateLastUrnUrl = `${this.scorpioUrl}/urn:ngsi-ld:factory-id-store/attrs`;
        await axios.patch(updateLastUrnUrl, lastUrn, {headers});
    
        //store the template data to scorpio
        const response = await axios.post(this.scorpioUrl, result, {headers});
        return {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          id: result.id
        }
      } else{
        return {
          "success": false,
          "status": 409,
          "message": "Factory Name Already Exists"
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async findAll(token: string) {
    try {
      const factorySiteData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      let factorySiteType = "https://industry-fusion.org/types/v0.1/factorySite";
      const url = this.scorpioUrl + '/?type=' + factorySiteType;
      const response = await axios.get(url, {headers});
      if(response.data.length > 0) {
        response.data.forEach(data => {
          factorySiteData.push(data);
        });
      }
      return factorySiteData;
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
        throw new NotFoundException('factory-site not found');
      }
    } catch (err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  async update(id: string, data, token: string) {
    try {
      data['@context'] = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld";
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      let flag = true;
      if(data["http://www.industry-fusion.org/schema#factory_name"]) {
        let factoryName = data["http://www.industry-fusion.org/schema#factory_name"];
        let checkUrl = `${this.scorpioUrl}?type=${data.type}&q=http://www.industry-fusion.org/schema%23factory_name==%22${factoryName}%22`;
        let factoryData = await axios.get(checkUrl, { headers });

        if(factoryData.data.length) {
          flag= false;
        }
      }
      if(flag) {
        const url = this.scorpioUrl + '/' + id + '/attrs';
        const response = await axios.post(url, data, {headers});
        return {
          status: response.status,
          data: response.data
        }
      } else {
        return {
          "success": false,
          "status": 409,
          "message": "Factory Name Already Exists"
        }
      }
    } catch(err) {
      throw err;
    }
  }

  async remove(id: string, token: string, shopFloorService: ShopFloorService) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.delete(url, {headers});
      if(response['status'] == 200 || response['status'] == 204) {
        let deleteResponse = await shopFloorService.deleteScript(id, token);
        return {
          status: deleteResponse.status
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async removeScript(id: string, token: string) {
    try {
      console.log('inside remove script');
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const url = this.scorpioUrl + '/' + id;
      const response = await axios.delete(url, {headers});
      console.log('delete response ',response.status);
      return {
        status: response.status,
        data: response.data
      }
    } catch (err) {
      throw err;
    }
  }
}
