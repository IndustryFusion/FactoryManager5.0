import { Injectable, NotFoundException,Logger, ConsoleLogger } from '@nestjs/common';
import axios from 'axios';
import * as moment from 'moment';
import { RedisService } from '../redis/redis.service';
@Injectable()
export class PowerConsumptionService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  private readonly logger = new Logger(PowerConsumptionService.name);
  constructor(private readonly redisService: RedisService) {}

  async findComsumtionPerDay(token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const currentDate = moment().format('YYYY-MM-DD');
      
  
    // Check for cached data first
   const cacheKey = `dailyConsumption:${currentDate}`;
   const tokenChanged = await this.redisService.tokenHasChanged(cacheKey, token);


if (!tokenChanged) {
  // Attempt to retrieve cached data if the token hasn't changed
  const cachedValue = await this.redisService.getData(cacheKey);
  if (cachedValue !== null) {
    console.log('Returning cached daily consumption data');
    return cachedValue;
  }
}
      const currentTime = moment().format().split('+')[0] + '-00:00';
      const startTimeOfDay = moment().startOf('day').format().split('+')[0] + '-00:00';
      // //console.log('currentTime ',currentTime);
      // //console.log('startTimeOfDay ',startTimeOfDay);
      const url = this.timescaleUrl + '?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.urn:ngsi-ld:asset:2:089' + `&observedAt=gte.${startTimeOfDay}&observedAt=lte.${currentTime}&order=observedAt.asc&value=neq.0`;
      const response = await axios.get(url, {headers});
      //console.log('responsePgrest ',response.data)
      if(response.data.length > 0) {
        let startValue = response.data[0].value;
        let endValue = response.data[response.data.length - 1].value;
        let finalValue = Math.abs(Number(startValue) - Number(endValue));
        const secondsTillEndOfDay = moment().endOf('day').diff(moment(), 'seconds');
        console.log("finalValue", finalValue)
        await this.redisService.saveDataWithToken(cacheKey, finalValue, token, secondsTillEndOfDay);
        return finalValue;
      }
    } catch(err) {
      console.log("No Data")
    }
  }

  async findChartData(assetId: string, type: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };

      const labels = [], powerConsumption = [], emission = [];
      
      const redisKey = `chartData:${assetId}:${type}`;

          // Check if credentials have changed and update Redis accordingly
      const credentialsChanged = await this.redisService.credentialsChanged(token, { assetId, type }, assetId);
      if (credentialsChanged) {
          await this.redisService.saveTokenAndEntityId(token, { assetId, type }, assetId);

          // console.log("types",{ assetId, type }, assetId);
          // console.log("Credentials or queryParams have changed. Saving new values to Redis.");
      }

      // Try fetching cached data first
      // const cachedData = await this.redisService.getData(redisKey);
      // if (cachedData) {
      //     console.log("Returning cached data for", redisKey);
      //     return cachedData;
      // }
      if(type == 'days'){
        for (let i = 6; i >= 0; i--) {
          const day = moment().subtract(i, 'days').startOf('day');
          let startTime = day.format().split('+')[0] + '-00:00';
          let endTime = day.endOf('day').format().split('+')[0] + '-00:00';
          labels.push(day.format('MMMM Do'));
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${startTime}&observedAt=lte.${endTime}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});
          // console.log("labels",response.data)
          if(response.data.length > 0){
            let startValue = response.data[0].value;
            let endValue = response.data[response.data.length - 1].value;
              if (i === 0) { // Check if it's the current day
                let modValue = Math.abs(Number(startValue) - Number(endValue));
                powerConsumption.push(modValue);
                emission.push((modValue * 485) / 1000);
             } else {
            let finalValue = Math.abs(Number(startValue) - Number(endValue));
            
            powerConsumption.push(finalValue);
            emission.push((finalValue * 485) / 1000);
         } 
        } 
         
         else {
            powerConsumption.push(0);
            emission.push(0);
          }
        }

       await this.redisService.saveData(redisKey, { labels, powerConsumption, emission }, 86400 * 8);
        return {
          labels,
          powerConsumption,
          emission
        }
      } else if(type == 'weeks'){
        for (let i = 5; i >= 0; i--) {
          // Calculate the start and end of the each week
          let startOfWeek = moment().clone().subtract(i, 'weeks').startOf('week');
          let endOfWeek = moment().clone().subtract(i, 'weeks').endOf('week');
      
          // Format the start and end dates
          const formattedStartOfWeek = startOfWeek.format().split('+')[0] + '-00:00';
          const formattedEndOfWeek = endOfWeek.format().split('+')[0] + '-00:00';
      
          labels.push(`Week ${startOfWeek.format('YYYY-MM-DD')}`);
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${formattedStartOfWeek}&observedAt=lte.${formattedEndOfWeek}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});

          if(response.data.length >= 0){
            let startValue = response.data[0].value;
            let endValue = response.data[response.data.length - 1].value;
            let finalValue = Math.abs(Number(startValue) - Number(endValue));
            powerConsumption.push(finalValue);
            emission.push((finalValue * 485) / 1000);
          } else {
            powerConsumption.push(0);
            emission.push(0);
          }
        }
        await this.redisService.saveData(redisKey, { labels, powerConsumption, emission }, 86400 * 8);
        return {
          labels,
          powerConsumption,
          emission
        }
      } else{
        for (let i = 5; i >= 0; i--) {
          // Calculate the start and end of the current month
          const startOfMonth = moment().clone().subtract(i, 'months').startOf('month');
          const endOfMonth = moment().clone().subtract(i, 'months').endOf('month');
      
          // Format the start and end dates
          const formattedStartOfMonth = startOfMonth.format().split('+')[0] + '-00:00';
          const formattedEndOfMonth = endOfMonth.format().split('+')[0] + '-00:00';
      
          const monthName = moment(startOfMonth).format('MMMM');
          labels.push(monthName);
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${formattedStartOfMonth}&observedAt=lte.${formattedEndOfMonth}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});
          if(response.data.length >= 0){
            let startValue = response.data[0].value;
            let endValue = response.data[response.data.length - 1].value;
            let finalValue = Math.abs(Number(startValue) - Number(endValue));
            powerConsumption.push(finalValue);
            emission.push((finalValue * 485) / 1000);
          } else {
            powerConsumption.push(0);
            emission.push(0);
          }
        }
   
      
        return {
          labels,
          powerConsumption,
          emission
        }
      }
      
    }catch (err) {
    // this.logger.error('Error fetching chart data: ' + err.message);
    //When we dont Get data for a particular Time Frame then its coming in catch block 
    const defaultData = {
        labels: [],  // You should populate this with the intended date labels
        powerConsumption: [],
        emission: []
    };

    // Generate labels based on the 'type' provided, for example, last 7 days if type is 'days'
    if (type === 'days') {
        for (let i = 6; i >= 0; i--) {
            const day = moment().subtract(i, 'days').format('MMMM Do');
            defaultData.labels.push(day);
            defaultData.powerConsumption.push(0);
            defaultData.emission.push(0);
        }
    } else if (type === 'weeks') {
        for (let i = 5; i >= 0; i--) {
            const weekStart = moment().subtract(i, 'weeks').startOf('week').format('YYYY-MM-DD');
            defaultData.labels.push(` ${weekStart}`);
            defaultData.powerConsumption.push(0);
            defaultData.emission.push(0);
        }
    } else if (type === 'months') {
        for (let i = 5; i >= 0; i--) {
            const month = moment().subtract(i, 'months').format('MMMM');
            defaultData.labels.push(month);
            defaultData.powerConsumption.push(0);
            defaultData.emission.push(0);
        }
    }

    return defaultData;
  }

  }

}
