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
    console.log("queryparams ", queryParams)
   // Check if credentials or query parameters have changed
 const credentialsChanged = await this.redisService.credentialsChanged(token, queryParams, queryParams.entityId);
  if (credentialsChanged) {
    await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId);
    console.log("Credentials or queryParams have changed. Saving new values to Redis.");
  } else {
    console.log("Credentials and queryParams unchanged. Skipping Redis update.");
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
          let storedDataKey = `data:${queryParams.entityId}`; 
          let storedData = await this.redisService.getData(storedDataKey) || {};
        
            if (!isEqual(response.data, storedData)) {
              // console.log("Data has changed. Emitting new data through WebSocket.");
              await this.redisService.saveData(storedDataKey, response.data); // Update stored data
              this.emitUpdate(response.data); // Emit only the new or updated data points
            } else {
              console.log("Data unchanged. No need to emit.");
            }
      
            return response.data;
      } else {
        throw new NotFoundException('Data not found.');
      }

    } catch(err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
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
