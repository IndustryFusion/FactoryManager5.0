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
            .join('&').replace('#','%23');
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

  async findAll(assetId: string, type: string, token: string){
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };

      let redisKey = 'machine-state-params';
      await this.redisService.saveData(redisKey,{
        assetId,
        type,
        token
      })

      const finalData = {};
      if(type == 'days'){
        for (let i = 6; i >= 0; i--) {
          const day = moment().subtract(i, 'days').startOf('day');
          let startTime = day.format().split('+')[0] + '-00:00';
          let endTime = day.endOf('day').format().split('+')[0] + '-00:00';
          let key = day.format('MMMM Do');
          finalData[key] = [];
          const url = this.timescaleUrl + `/value_change_state_entries?attributeId=eq.http://www.industry-fusion.org/fields%23machine-state&entityId=${assetId}&observedAt=gte.${startTime}&observedAt=lte.${endTime}`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
            finalData[key].push(...response.data);
          }
        }
      } else if(type == 'weeks'){
        for (let i = 6; i >= 0; i--) {
          // Calculate the start and end of the each week
          let startOfWeek = moment().clone().subtract(i, 'weeks').startOf('week');
          let endOfWeek = moment().clone().subtract(i, 'weeks').endOf('week');
      
          // Format the start and end dates
          const formattedStartOfWeek = startOfWeek.format().split('+')[0] + '-00:00';
          const formattedEndOfWeek = endOfWeek.format().split('+')[0] + '-00:00';
      
          let key = `Week ${startOfWeek.format('YYYY-MM-DD')}`;
          finalData[key] = [];
          const url = this.timescaleUrl + `/value_change_state_entries?attributeId=eq.http://www.industry-fusion.org/fields%23machine-state&entityId=${assetId}&observedAt=gte.${formattedStartOfWeek}&observedAt=lte.${formattedEndOfWeek}`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
            finalData[key].push(...response.data);
          }
        }
      } else{
        for (let i = 6; i >= 0; i--) {
          // Calculate the start and end of the current month
          const startOfMonth = moment().clone().subtract(i, 'months').startOf('month');
          const endOfMonth = moment().clone().subtract(i, 'months').endOf('month');
      
          // Format the start and end dates
          const formattedStartOfMonth = startOfMonth.format().split('+')[0] + '-00:00';
          const formattedEndOfMonth = endOfMonth.format().split('+')[0] + '-00:00';
      
          const key = moment(startOfMonth).format('MMMM');
          finalData[key] = [];
          const url = this.timescaleUrl + `/value_change_state_entries?attributeId=eq.http://www.industry-fusion.org/fields%23machine-state&entityId=${assetId}&observedAt=gte.${formattedStartOfMonth}&observedAt=lte.${formattedEndOfMonth}`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
            finalData[key].push(...response.data);
          }
        }
      }
      return finalData;
    }catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

}
