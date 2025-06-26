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
import * as moment from 'moment';
import { RedisService } from '../redis/redis.service'; 

@Injectable()
export class ValueChangeStateService {
  constructor(
    private readonly redisService : RedisService,
  ){}
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  async findOne(queryParams: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const queryString = Object.keys(queryParams)
            .map(key => {
                if(key.includes('_')){
                  let actualKey = key.split('_')[0];
                  let filter = key.split('_')[1];
                  return actualKey + '=' + `${filter}.${queryParams[key]}` 
                } else {
                  return key + '=' + queryParams[key] 
                }
              })
            .join('&');
      const url = this.timescaleUrl + '/value_change_state_entries?' + queryString;
      const response = await axios.get(url, {headers});
      if (response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async findAll(assetId: string, attributeId: string, type: string, token: string){
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };

      let redisKey = 'machine-state-params';
      await this.redisService.saveData(redisKey,{
        assetId,
        attributeId,
        type,
        token
      })

      const finalData: Record<string, any[]> = {};
      const requests: Promise<any>[] = [];
      const keys: string[] = [];

      const now = moment();

      for (let i = 6; i >= 0; i--) {
        let startTime: string, endTime: string, key: string;

        if (type === 'days') {
          const day = now.clone().subtract(i, 'days').startOf('day');
          startTime = day.format('YYYY-MM-DDT00:00:00-00:00');
          endTime = day.clone().endOf('day').format('YYYY-MM-DDT23:59:59-00:00');
          key = day.format('MMMM Do');
        } else if (type === 'weeks') {
          const startOfWeek = now.clone().subtract(i, 'weeks').startOf('week');
          const endOfWeek = now.clone().subtract(i, 'weeks').endOf('week');
          startTime = startOfWeek.format('YYYY-MM-DDT00:00:00-00:00');
          endTime = endOfWeek.format('YYYY-MM-DDT23:59:59-00:00');
          key = `Week ${startOfWeek.format('YYYY-MM-DD')}`;
        } else {
          const startOfMonth = now.clone().subtract(i, 'months').startOf('month');
          const endOfMonth = now.clone().subtract(i, 'months').endOf('month');
          startTime = startOfMonth.format('YYYY-MM-DDT00:00:00-00:00');
          endTime = endOfMonth.format('YYYY-MM-DDT23:59:59-00:00');
          key = startOfMonth.format('MMMM');
        }

        const url = `${this.timescaleUrl}/value_change_state_entries?` +
          `${attributeId ? `attributeId=${attributeId}&` : ''}` +
          `entityId=${assetId}&observedAt=gte.${startTime}&observedAt=lte.${endTime}`;

        keys.push(key);
        finalData[key] = [];
        requests.push(axios.get(url, { headers }));
      }
      console.log("requests ",requests)
      const responses = await Promise.allSettled(requests);
      responses.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value?.data?.length > 0) {
          finalData[keys[idx]].push(...res.value.data);
        } else if (res.status === 'rejected') {
          console.warn(`Request for ${keys[idx]} failed:`, res.reason?.message || res.reason);
        }
      });
      return finalData;
    }catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

}
