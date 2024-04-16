import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PgRestGateway } from './pgrest.gatway';
import { RedisService } from '../redis/redis.service';
import { isEqual } from 'lodash';
import { Server } from 'socket.io'; 

@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  private lastFetchedData: any = {};

  constructor(private pgRestGateway: PgRestGateway, private redisService: RedisService) {
    
  }
  
    async emitUpdate(data: any) {
    // Emit data update through WebSocket
    this.pgRestGateway.sendUpdate(data);
  }

  create() {
    return 'This action adds a new factoryManager';
  }

  async findAll(token : string, queryParams: any) {
    // console.log("queryparams ", queryParams)
   // Check if credentials or query parameters have changed
      const credentialsChanged = await this.redisService.credentialsChanged(token, queryParams, queryParams.entityId, queryParams.attributeId);
        if (credentialsChanged) {
          await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId,queryParams.attributeId);
          // console.log("Credentials or queryParams have changed. Saving new values to Redis.",queryParams);
        } else {
          // console.log("Credentials and queryParams unchanged. Skipping Redis update.");
        }

    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };

      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + queryParams[key])
            .join('&').replace('#','%23');

      const url = this.timescaleUrl + '/entityhistory?' + queryString;
      
      const response = await axios.get(url, {headers});

     if (response.data) {
            return response.data;
      } else {
        throw new NotFoundException('Data not found.');
      }

    } catch(err) {
      console.log("Testing purpose : PGREST SERVICE ERROR FOUND")
    }
  }

  findOne(id: string) {
    return `This action returns a #${id} factoryManager`;
  }

  update(id: string) {
    return `This action updates a #${id} factoryManager`;
  }

  remove(id: string) {
    return `This action removes a #${id} factoryManager`;
  }
}
