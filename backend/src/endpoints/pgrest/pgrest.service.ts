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
import { upstreamMessage } from '../../utils/upstream-error';
import { summariseRows } from './reported-attributes';
@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  /**
   * How many rows the attribute listing will read before it gives up on being
   * exhaustive. Nothing in this repo creates an index on `attributes`, and the
   * widest interval is twenty-one hours across every attribute of an asset, so
   * the listing asks for the newest rows and stops.
   */
  private readonly discoveryLimit =
    parseInt(process.env.PGREST_DISCOVERY_LIMIT ?? '', 10) || 20000;
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
      if (err.response) {
        throw new HttpException({
          errorCode: `FS_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "FS_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  /**
   * The window a request asks for, as the two strings the upstream query uses.
   *
   * Lifted out of findAll so the attribute listing covers exactly the range the
   * chart is drawn from. Two copies of this rule would drift, and the spans are
   * not self-evident: every interval reaches back seven times its own label, so
   * "10 Min" is seventy minutes of history.
   */
  private windowFor(queryParams: any): { from: string; to: string } {

    function parseObservedAt(observedAt) {
      const times = observedAt.split('&');
      const startTime = times[0].split('gte.')[1];
      const endTime = times[1].split('lt.')[1];
      return { startTime, endTime };
    }

    let startTime: any;
    let endTime = moment().seconds(0).milliseconds(0); // Round down to the nearest minute

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
          throw new HttpException("Custom time range parameters are invalid", HttpStatus.BAD_REQUEST);
        }
        break;
    default:
      throw new HttpException("Invalid interval type specified", HttpStatus.BAD_REQUEST);
    }

    return {
      from: startTime.utc().format("YYYY-MM-DDTHH:mm:ss") + "-00:00",
      to: endTime.utc().format("YYYY-MM-DDTHH:mm:ss") + "-00:00",
    };
  }

  async findAll(token, queryParams, key) {

    key = queryParams.attributeId.split("eq.").pop();

    if (!token) {
      throw new HttpException("Authorization token is missing", HttpStatus.NOT_FOUND);
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const { from: startTimeFormatted, to: endTimeFormatted } = this.windowFor(queryParams);

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
        
        // Store data in Redis for live updates via WebSocket
        if (queryParams.intervalType === 'live' && response.data && response.data.length > 0) {
          await this.redisService.saveData('storedData', response.data);
          await this.redisService.saveData('storedDataQueryParams', queryParams);
          console.log('✅ Saved live data to Redis for WebSocket updates');
        } else if (queryParams.intervalType !== 'live') {
          // Clear Redis data when switching away from live mode
          await this.redisService.deleteKey('storedData');
          await this.redisService.deleteKey('storedDataQueryParams');
          console.log('🧹 Cleared live data from Redis (non-live interval selected)');
        }
        
        return response.data;
      } catch (err) {
        if (err.response) {
          throw new HttpException({
            errorCode: `PG_${err.response.status}`,
            message: upstreamMessage(err)
          }, err.response.status);
        } else {
          throw new HttpException({
            errorCode: "PG_500",
            message: err.message
          }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
  }

  /**
   * Which attributes an asset actually reported in a window, and whether each
   * one's value moved.
   *
   * The Data Viewer's parameter list used to come from the NGSI-LD entity,
   * which says what a machine is meant to report. This says what it did report:
   * a gateway writes attributes the entity never marked `realtime`, and the
   * entity declares sensors that have never sent a row. The caller still
   * filters this with the metadata it holds — the time series cannot tell a
   * measurement from a product name on its own, which is what `changed` is for.
   *
   * Read-only, and cached for a minute per asset and interval: every reader of
   * the same machine asks the same question, and the answer cannot usefully
   * change faster than the window slides.
   */
  async reportedAttributes(token: string, queryParams: any) {
    if (!token) {
      throw new HttpException("Authorization token is missing", HttpStatus.NOT_FOUND);
    }

    const given = typeof queryParams?.entityId === 'string' ? queryParams.entityId.trim() : '';
    if (!given) {
      throw new HttpException(
        "entityId is required, as entityId=eq.<urn>",
        HttpStatus.BAD_REQUEST,
      );
    }
    const entityFilter = given.startsWith('eq.') ? given : `eq.${given}`;

    const { from, to } = this.windowFor(queryParams);

    // Keyed by the window, not just the interval, so a custom range cannot be
    // served another range's answer. Namespaced away from `storedData`, which
    // is the socket handoff and must keep living without a TTL.
    const cacheKey =
      `reported-attributes:${entityFilter}:${queryParams.intervalType}` +
      (queryParams.intervalType === 'custom' ? `:${from}:${to}` : '');

    try {
      const cached = await this.redisService.getData(cacheKey);
      if (cached) return cached;
    } catch (err) {
      // A cache that cannot be read is not a reason to fail the request.
      console.warn(`Could not read ${cacheKey} from Redis: ${err.message}`);
    }

    const headers = { Authorization: `Bearer ${token}` };
    const filters = [
      `entityId=${entityFilter}`,
      `observedAt=gte.${from}`,
      `observedAt=lte.${to}`,
      `order=observedAt.desc`,
      `limit=${this.discoveryLimit}`,
    ].join('&');
    // Only three of the thirteen columns are needed. If this PostgREST refuses
    // the projection, the same query without it gives the same answer in more
    // bytes — so a rejection is retried rather than surfaced.
    const url = `${this.timescaleUrl}?select=attributeId,value,observedAt&${filters}`;

    try {
      let rows: any[];
      try {
        rows = (await axios.get(url, { headers })).data;
      } catch (err) {
        if (err.response?.status !== HttpStatus.BAD_REQUEST) throw err;
        console.warn('PostgREST refused the column projection; reading full rows instead.');
        rows = (await axios.get(`${this.timescaleUrl}?${filters}`, { headers })).data;
      }

      const list = Array.isArray(rows) ? rows : [];
      const answer = {
        from,
        to,
        // The window held more than was read, so an attribute that only
        // reported in the older part of it is missing from this list.
        truncated: list.length >= this.discoveryLimit,
        attributes: summariseRows(list),
      };

      try {
        await this.redisService.saveData(cacheKey, answer, 60);
      } catch (err) {
        console.warn(`Could not cache ${cacheKey}: ${err.message}`);
      }
      return answer;
    } catch (err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getTenDaysMachineState(token: string) {
    try {
      if (!token) {
        throw new HttpException("Authorization token is missing", HttpStatus.NOT_FOUND);
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const response = await axios.get(this.machineState10DaysUrl, { headers });
      return response.data;
    } catch(err) {
      if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getIntraDayMachineState(token: string) {
    try {
      if (!token) {
        throw new HttpException("Authorization token is missing", HttpStatus.NOT_FOUND);
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
      if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: upstreamMessage(err)
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
