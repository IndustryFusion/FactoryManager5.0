import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PgRestGateway } from './pgrest.gatway';
import { RedisService } from '../redis/redis.service';
import { isEqual } from 'lodash';
import { Server } from 'socket.io'; 
import * as moment from 'moment';


@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  private lastFetchedData: any = {};

  constructor(private pgRestGateway: PgRestGateway, private redisService: RedisService) {
    
  }
    async emitUpdate(data: any) {
    this.pgRestGateway.sendUpdate(data);
  }

  create() {
    return 'This action adds a new factoryManager';
  }

  async findLiveData(token : string, queryParams: any) {
    await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId,queryParams.attributeId);
    
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + queryParams[key])
            .join('&').replace('#','%23');

      const url = this.timescaleUrl + '/entityhistory?' + queryString;
      const response = await axios.get(url, {headers});
      
   
      return response.data;
     

    } catch(err) {
      console.log("PGREST SERVICE ERROR FOUND")
    }
  }


async findAll(token, queryParams) {

  await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId,queryParams.attributeId);
  function parseObservedAt(observedAt) {
  const times = observedAt.split('&');
  const startTime = times[0].split('gte.')[1];
  const endTime = times[1].split('lt.')[1];
  return { startTime, endTime };
}
  
  if (!token) {
    throw new Error("Authorization token is missing");
  }

  const headers = {
    Authorization: `Bearer ${token}`
  };

    let startTime;
    let endTime = moment().seconds(0).milliseconds(0); // Round down to the nearest minute

  if (queryParams.intervalType) {
     switch (queryParams.intervalType) {
        case "live":
          // Set startTime to 7 minutes before the current time, rounded down to the nearest minute
          startTime = endTime.clone().subtract(7, 'minutes');
          break;
        case "10min":
          startTime = endTime.clone().subtract(70, 'minutes');
          break;
        case "30min":
          startTime = endTime.clone().subtract(210, 'minutes');
          break;
        case "60min":
          startTime = endTime.clone().subtract(420, 'minutes');
          break;
        case "3hour":
          startTime = endTime.clone().subtract(1260, 'minutes');
          break;

        case "custom":
          const { startTime: customStart, endTime: customEnd } = parseObservedAt(queryParams.observedAt);
          startTime = moment(customStart);
          endTime = moment(customEnd);
          if (!startTime.isValid() || !endTime.isValid()) {
            throw new Error("Custom time range parameters are invalid");
          }
          break;
      default:
        throw new Error("Invalid interval type specified");
     }
    }

  const startTimeFormatted = startTime.utc().format("YYYY-MM-DDTHH:mm:ss") + "-00:00";
  const endTimeFormatted = endTime.utc().format("YYYY-MM-DDTHH:mm:ss") + "-00:00";

  const attributeId = `attributeId=eq.http://www.industry-fusion.org/fields%23${queryParams.attributeId.split('eq.')[1]}`;
  const entityId = `entityId=${queryParams.entityId}`;
  const observedAt = `observedAt=gte.${startTimeFormatted}&observedAt=lte.${endTimeFormatted}`;
  const order = `order=${queryParams.order}`;
  const value = `value=neq.0`;

  const queryString = [attributeId, entityId, observedAt, order, value].join('&');
  const url = `${this.timescaleUrl}/entityhistory?${queryString}`;

  try {
   const response = await axios.get(url, { headers });
     await this.redisService.saveData("storedDataQueryParams", queryParams);

    if (queryParams.intervalType == "live" ) {
      // Store data in Redis only if the intervalType is 'live'
      await this.redisService.saveData("storedData", response.data);
      return response.data ;
   
    
    }
    return response.data ;
  } catch (err) {
    console.log("Error fetching data from TimescaleDB:");
   
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
