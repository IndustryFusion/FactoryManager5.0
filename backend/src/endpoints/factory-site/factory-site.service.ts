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

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FactorySiteDescriptionDto } from './dto/factorySiteDescription.dto';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import axios from 'axios';
import { FactorySite } from '../schemas/factory-site.schema';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

interface FactoryData {
  nodes: any[]; 
  edges: any[]
}

interface FactoryReactData {
  factoryId: string;
  factoryData: FactoryData;
}

@Injectable()
export class FactorySiteService {
  constructor(
    @InjectModel(FactorySite.name)
    private factoryModel: Model<FactorySite>,
  ){}
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
        try {
          const getLastUrn = await axios.get(fetchLastUrnUrl, {
            headers
          });
        }
        catch(error) {
          if (error.response && error.response.status === 404){
            const factoryStore = {
              "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld",
              "id": "urn:ngsi-ld:factory-id-store",
              "type": "https://industry-fusion.org/base/v0.1/urn-holder",
              "http://www.industry-fusion.org/schema#last-urn": {
                  "type": "Property",
                  "value": "urn:ngsi-ld:factories:2:000"
              }
            }
            const response = await axios.post(this.scorpioUrl, factoryStore, {headers});
            if (response.status !== 201){
              return {
                "success": false,
                "status": 500,
                "message": "Initial factory URN holder creation failed"
              }
            }
          }
        }
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
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
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
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async companySpecificFactories(company_ifric_id: string, token: string) {
    try {
      const factorySiteData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      let factorySiteType = "https://industry-fusion.org/types/v0.1/factorySite";
      const url = this.scorpioUrl + '/?type=' + factorySiteType;
      let companyIfricIdKey = "";
      const response = await axios.get(url, {headers});
      if(response.data.length > 0) {
        response.data.forEach(data => {
          if(!companyIfricIdKey) {
            companyIfricIdKey = Object.keys(data).find(key => key.includes("#company_ifric_id"));
          }
          
          if(companyIfricIdKey && data[companyIfricIdKey] && data[companyIfricIdKey].value === company_ifric_id) {
            factorySiteData.push(data);
          }
        });
      }
      return factorySiteData;
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
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
      return response.data;
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
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
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
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
      // Delete Factory 
      const response = await axios.delete(url, {headers});
      if(response['status'] == 200 || response['status'] == 204) {
        // Delete shopFloor and the asset relations
        let factoryReactData = await this.factoryModel.find({factoryId: id}) as FactoryReactData[];
        if(factoryReactData.length > 0){
          let deleteResponse = await shopFloorService.deleteScript(factoryReactData[0].factoryData.nodes, token);
          if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204){
            // Delete react flow for that factory
            let deleteReactResponse = await this.factoryModel.deleteOne({factoryId: id});
            return deleteReactResponse;
          }
        }else{
          return {
            status: response.status,
            data: response.data
          }
        }
      }
    } catch (err) {
      if(err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async removeScript(id: string, token: string) {
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
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: err.response.data.message || err.response.data.title
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
