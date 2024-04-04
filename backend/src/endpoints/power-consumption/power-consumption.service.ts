import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as moment from 'moment';
@Injectable()
export class PowerConsumptionService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;

  async findComsumtionPerDay(token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const currentTime = moment().format().split('+')[0] + '-00:00';
      const startTimeOfDay = moment().startOf('day').format().split('+')[0] + '-00:00';
      console.log('currentTime ',currentTime);
      console.log('startTimeOfDay ',startTimeOfDay);
      const url = this.timescaleUrl + '/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.urn:ngsi-ld:asset:2:089' + `&observedAt=gte.${startTimeOfDay}&observedAt=lte.${currentTime}&order=observedAt.asc`;
      const response = await axios.get(url, {headers});
      console.log('responsePgrest ',response.data)
      if(response.data.length > 0) {
        let startValue = response.data[0].value;
        let endValue = response.data[response.data.length - 1].value;
        let finalValue = Math.abs(Number(startValue) - Number(endValue));
        return finalValue;
      }
    } catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async findChartData(assetId: string, type: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      console.log('type ',type);
      const labels = [], powerConsumption = [], emission = [];
      if(type == 'days'){
        for (let i = 6; i >= 0; i--) {
          const day = moment().subtract(i, 'days').startOf('day');
          let startTime = day.format().split('+')[0] + '-00:00';
          let endTime = day.endOf('day').format().split('+')[0] + '-00:00';
          console.log('startTime ',startTime);
          console.log('endTime ',endTime);
          labels.push(day.format('MMMM Do'));
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${startTime}&observedAt=lte.${endTime}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
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
        console.log('labels for days ',labels);
        console.log('powerConsumption ',powerConsumption);
        console.log('emission ',emission);
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
      
          console.log(`Week ${startOfWeek.format('YYYY-MM-DD')}`);
          console.log('Start:', formattedStartOfWeek);
          console.log('End:', formattedEndOfWeek);
          console.log();
          labels.push(`Week ${startOfWeek.format('YYYY-MM-DD')}`);
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${formattedStartOfWeek}&observedAt=lte.${formattedEndOfWeek}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
            console.log(`response from week ${i + 1} `,response.data);
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
        console.log('labels for weeks ',labels);
        console.log('powerConsumption ',powerConsumption);
        console.log('emission ',emission);
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
      
          console.log(`Month ${i + 1}:`);
          console.log('Start:', formattedStartOfMonth);
          console.log('End:', formattedEndOfMonth);
          console.log();
          const monthName = moment(startOfMonth).format('MMMM');
          labels.push(monthName);
          const url = this.timescaleUrl + `/entityhistory?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${formattedStartOfMonth}&observedAt=lte.${formattedEndOfMonth}&order=observedAt.asc&value=neq.0`;
          const response = await axios.get(url, {headers});
          if(response.data.length > 0){
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
        console.log('labels for months ',labels);
        console.log('powerConsumption ',powerConsumption);
        console.log('emission ',emission);
        return {
          labels,
          powerConsumption,
          emission
        }
      }
      
    }catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }
}
