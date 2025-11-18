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

import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import * as moment from 'moment';
import { AssetService } from '../asset/asset.service';
import { HttpException, HttpStatus } from '@nestjs/common';
@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  private readonly machineState10DaysUrl = process.env.MACHINE_STATE_10_DAYS_URL;
  private readonly machineStateIntraDayUrl = process.env.MACHINE_STATE_INTRA_DAY_URL;
  constructor(
    private redisService: RedisService,
    private readonly assetService: AssetService
  ) {}

  async findLiveData(token : string, queryParams: any) {    
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + queryParams[key])
            .join('&');

      const url = this.timescaleUrl + '?' + queryString;
      const response = await axios.get(url, {headers});
      return response.data;
    } catch(err) {
      return [];
    }
  }

  async findAll(token, queryParams, key) {

    key = queryParams.attributeId.split("eq.").pop();

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

    let startTime: any;
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
    
    const assetId = queryParams.entityId.split("eq.").pop();
    
    // fetch actual key from asset data 

      const attributeId = `attributeId=eq.${"https://industry-fusion.org/base/v0.1/" + key}`;
      const entityId = `entityId=${queryParams.entityId}`;
      const observedAt = `observedAt=gte.${startTimeFormatted}&observedAt=lte.${endTimeFormatted}`;
      const order = `order=${queryParams.order}`;
      // const value = `value=neq.0`;

      const queryString = [entityId, attributeId, observedAt, order].join('&');
      const url = `${this.timescaleUrl}?${queryString}`;
      
      try {
        const response = await axios.get(url, { headers });
        return response.data;
      } catch (err) {
        return [];
      }

  }

  async getTenDaysMachineState(token: string) {
    try {
      if (!token) {
        throw new Error("Authorization token is missing");
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const response = await axios.get(this.machineState10DaysUrl, { headers });
      return response.data;
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getIntraDayMachineState(token: string) {
    try {
      if (!token) {
        throw new Error("Authorization token is missing");
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const response = await axios.get(this.machineStateIntraDayUrl, { headers });
      const data = response.data;

      // return only last 24hr data
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); 

      const filtered = data.filter((item) => {
        const [day, month, year] = item.date.split(".");
        const time = item.time; 

        const dateObj = new Date(`${year}-${month}-${day}T${time}:00`);

        return dateObj >= startTime;
      });
      return filtered;
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
}
