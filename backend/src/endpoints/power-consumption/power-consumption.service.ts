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

import { Injectable, NotFoundException,Logger, ConsoleLogger } from '@nestjs/common';
import axios from 'axios';
import * as moment from 'moment';
import { RedisService } from '../redis/redis.service';
@Injectable()
export class PowerConsumptionService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  private readonly logger = new Logger(PowerConsumptionService.name);
  constructor(private readonly redisService: RedisService) {}

  async findOne(queryParams: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const labels = [], powerConsumption = [], emission = [];
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
      const url = this.timescaleUrl + '/power_emission_entries_days?' + queryString;
      const response = await axios.get(url, {headers});
      // console.log('response ',response.data)
      if(response.data.length > 0){
        response.data.forEach(data => {
          const day = moment(data.day);
          labels.push(day.format('MMMM Do'));
          powerConsumption.push(Number(data.total_power_consumption).toFixed(2));
          emission.push(Number(data.total_carbon_emission).toFixed(2));
        });
      }
      return {
        labels,
        powerConsumption,
        emission
      }
    } catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async findChartData(queryParams: any, token: string) {
    try {
      console.log('queryParams ',queryParams);
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const labels = [], powerConsumption = [], emission = [];
      const redisKey = `chartData:${queryParams.assetId}:${queryParams.type}`;

      // Check if credentials have changed and update Redis accordingly
      // const credentialsChanged = await this.redisService.credentialsChanged(token, queryParams, queryParams.assetId);
      // if (credentialsChanged) {
      //   await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.assetId);
      // }

      if(queryParams.type == 'days'){
        const url = this.timescaleUrl + `/power_emission_entries_days?entityId=eq.${queryParams.assetId}&day=gte.${moment.utc(queryParams.startTime).toISOString()}&day=lte.${moment.utc(queryParams.endTime).toISOString()}`;
        console.log('url ',url);
        const response = await axios.get(url, {headers});
        if(response.data.length > 0){
          response.data.forEach(data => {
            const day = moment(data.day);
            labels.push(day.format('MMMM Do'));
            powerConsumption.push(Number(data.total_power_consumption).toFixed(2));
            emission.push(Number(data.total_carbon_emission).toFixed(2));
          });
        }
       // await this.redisService.saveData(redisKey, { labels, powerConsumption, emission }, 86400 * 8);
      } else if(queryParams.type == 'weeks'){
        const url = this.timescaleUrl + `/power_emission_entries_weeks?entityId=eq.${queryParams.assetId}&week=gte.${moment.utc(queryParams.startTime).toISOString()}&week=lte.${moment.utc(queryParams.endTime).toISOString()}`;
        const response = await axios.get(url, {headers});
        if(response.data.length > 0){
          response.data.forEach(data => {
            const week = moment(data.week);
            labels.push(`Week ${week.format('YYYY-MM-DD')}`);
            powerConsumption.push(Number(data.total_power_consumption).toFixed(2));
            emission.push(Number(data.total_carbon_emission).toFixed(2));
          });
        }
      } else{
        const url = this.timescaleUrl + `/power_emission_entries_months?entityId=eq.${queryParams.assetId}&month=gte.${moment.utc(queryParams.startTime).toISOString()}&month=lte.${moment.utc(queryParams.endTime).toISOString()}`;
        const response = await axios.get(url, {headers});
        if(response.data.length > 0){
          response.data.forEach(data => {
            const monthName = moment(data.week).format('MMMM');
            labels.push(monthName);
            powerConsumption.push(Number(data.total_power_consumption).toFixed(2));
            emission.push(Number(data.total_carbon_emission).toFixed(2));
          });
        }
      }
      return {
        labels,
        powerConsumption,
        emission
      }
    }catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }
}
