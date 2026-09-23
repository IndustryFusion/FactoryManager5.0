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
import { randomUUID } from 'crypto';
import { FactorySite } from '../schemas/factory-site.schema';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { upstreamMessage } from '../../utils/upstream-error';
import { linkTargets, prepareForScorpio, toLinks } from '../../utils/ngsi-ld';
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
  private readonly registryUrl = process.env.IFRIC_REGISTRY_BACKEND_URL;
  /**
   * Record the factory in the IFRIC registry and return the identifier it
   * mints for it.
   *
   * `factory_key` is a fresh UUID and is what the identifier is derived
   * from. Deliberately not the factory's name: the derivation is
   * deterministic, so a rename would otherwise change the identity of a
   * factory that is already referenced by its shop floors and assets.
   */
  private async registerFactory(
    data: FactorySiteDescriptionDto,
    companyIfricId: string,
    callerAuthorization: string,
  ): Promise<string> {
    if (!this.registryUrl) {
      throw new HttpException(
        'IFRIC_REGISTRY_BACKEND_URL is not configured, so a factory ' +
          'identifier cannot be issued.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const properties = data.properties ?? ({} as Record<string, any>);
    const response = await axios.post(
      `${this.registryUrl}/company/factories`,
      {
        factory_key: randomUUID(),
        owner_company_ifric_id: companyIfricId,
        location_name: properties['factory_name'],
        address_1: properties['street'],
        zip: properties['zip'],
        country: properties['country'],
      },
      {
        headers: {
          Authorization: callerAuthorization,
          'Content-Type': 'application/json',
        },
      },
    );

    const factoryId = response.data?.factory_id;
    if (!factoryId) {
      // An older registry accepts the call but mints nothing. Failing here is
      // better than falling back to a local id that is unique only to this
      // deployment — which is the problem this replaced.
      throw new HttpException(
        'The registry accepted the factory but returned no identifier. ' +
          'It may predate centrally minted factory ids.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return factoryId;
  }

  /**
   * Create a factory.
   *
   * The identifier comes from the IFRIC registry, which mints it through the
   * ICID service and records the factory against its owning company. It used
   * to come from a counter entity in this Scorpio instance
   * (`urn:ngsi-ld:factories:2:NNN`), which was unique only within one
   * deployment, and whose read-increment-write was not atomic — two
   * simultaneous creates took the same number.
   *
   * `callerAuthorization` is the signed-in user's bearer token, forwarded to
   * the registry. The registry decides from that token which company the
   * caller belongs to, so a factory can no longer be filed under a company
   * the caller does not belong to — which the browser used to assert.
   */
  async create(
    data: FactorySiteDescriptionDto,
    token: string,
    callerAuthorization: string,
    companyIfricId: string,
  ) {
    let mintedFactoryId: string | undefined;
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let checkUrl = `${this.scorpioUrl}?type=${data.type}&q=http://www.industry-fusion.org/schema%23factory_name==%22${data.properties['factory_name']}%22`;
      let factoryData = await axios.get(checkUrl, { headers });
      if(!factoryData.data.length){
        // The owner is taken from the caller's session, never from the
        // request body: the browser used to send it, and it was copied into
        // the entity unchecked.
        data.properties['company_ifric_id'] = companyIfricId;

        mintedFactoryId = await this.registerFactory(
          data,
          companyIfricId,
          callerAuthorization,
        );

        const result = {
          "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
          "id": mintedFactoryId,
          "type": data.type
        }
        for(let key in data.properties) {
          let resultKey = "http://www.industry-fusion.org/schema#" + key;
          if(key.includes("hasShopFloor")) {
            const links = toLinks(linkTargets({ type: "Relationship", object: data.properties[key] }));
            if (links) result[resultKey] = links;
          } else {
            result[resultKey] = { type: "Property", value: data.properties[key] };
          }
        }

        const factorySite = prepareForScorpio(result, { label: `factory site ${result.id}` });
        //store the template data to scorpio
        const response = await axios.post(this.scorpioUrl, factorySite, {headers});
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
      // The registry write cannot join Scorpio's write, so a factory recorded
      // centrally but never created here is removed again rather than left
      // as a record of something that does not exist.
      if (mintedFactoryId) {
        try {
          await axios.delete(
            `${this.registryUrl}/company/factories/${encodeURIComponent(mintedFactoryId)}`,
            { headers: { Authorization: callerAuthorization } },
          );
        } catch {
          // The caller's own error is the one worth reporting.
        }
      }
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
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
          message: upstreamMessage(err)
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
          message: upstreamMessage(err)
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
          message: upstreamMessage(err)
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
        const response = await axios.post(url, prepareForScorpio(data, { requireId: false, label: `update for ${id}` }), {headers});
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
          message: upstreamMessage(err)
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
          message: upstreamMessage(err)
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
          message: upstreamMessage(err)
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
