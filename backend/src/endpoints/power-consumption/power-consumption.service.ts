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
      const url = this.timescaleUrl + '?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.urn:ngsi-ld:asset:2:089' + `&observedAt=gte.${startTimeOfDay}&observedAt=lte.${currentTime}&order=observedAt.asc`;
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

  async findChartData(assetId: string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const lastSevenDays = [], powerConsumption = [], emission = [];
      for (let i = 0; i <= 6; i++) {
        const day = moment().subtract(i, 'days').startOf('day');
        let startTime = day.format().split('+')[0] + '-00:00';
        let endTime = day.endOf('day').format().split('+')[0] + '-00:00';
        console.log('startTime ',startTime);
        console.log('endTime ',endTime);
        lastSevenDays.push(day.format('MMMM Do'));
        const url = this.timescaleUrl + `?attributeId=eq.http://www.industry-fusion.org/fields%23power-consumption&entityId=eq.${assetId}&observedAt=gte.${startTime}&observedAt=lte.${endTime}&order=observedAt.asc&value=neq.0`;
        const response = await axios.get(url, {headers});
        if(response.data.length > 0){
          let startValue = response.data[0].value;
          let endValue = response.data[response.data.length - 1].value;
          let finalValue = Math.abs(Number(startValue) - Number(endValue));
          powerConsumption.push(finalValue);
          emission.push(finalValue * 485);
        } else {
          powerConsumption.push(0);
          emission.push(0);
        }
      }
      console.log('lastSevenDays ',lastSevenDays);
      console.log('powerConsumption ',powerConsumption);
      console.log('emission ',emission);
      return {
        lastSevenDays,
        powerConsumption,
        emission
      }
    }catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }
}
