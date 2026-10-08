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
import { LatestRow, buildParameterList, latestPerAttribute } from './parameters';
@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  /**
   * The attribute_latest view (see bootstrap/pdt-views.sql.ts): one row per
   * attribute an asset reported in the last seven days. It sits next to the
   * attributes table in the same PostgREST unless told otherwise.
   */
  private readonly attributeLatestUrl =
    process.env.PGREST_ATTRIBUTE_LATEST_URL ||
    (process.env.TIMESCALE_URL ?? '').replace(/\/[^/]*$/, '/attribute_latest');
  /**
   * When that view has not been created, the newest rows of the last seven
   * days are read instead, up to this many. Nothing in this repo indexes
   * `attributes`, so the scan asks for the newest rows and stops.
   */
  private readonly discoveryLimit =
    parseInt(process.env.PGREST_DISCOVERY_LIMIT ?? '', 10) || 20000;
  private readonly discoveryDays = 7;
  private readonly templateSandboxUrl = process.env.TEMPLATE_SANDBOX_BACKEND_URL;
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
      // Encoded, so an attribute IRI with a "#" (eclass) is not cut off as a URL fragment
      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + encodeURIComponent(queryParams[key]))
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

      // A full IRI is used as it is; a bare name is taken to be in the IFF
      // namespace, which is what this endpoint always assumed.
      const fullId = /^(https?:|urn:)/i.test(key) ? key : "https://industry-fusion.org/base/v0.1/" + key;
      const attributeId = `attributeId=eq.${encodeURIComponent(fullId)}`;
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
   * Every parameter the Data Viewer should offer for an asset: what Scorpio
   * and the template say it reports, joined with what the time series shows it
   * did report in the last seven days. See parameters.ts for the rule.
   *
   * Each source is optional. Without Scorpio the reported ones are still
   * listed, without the time series the declared ones are, so the list is
   * never empty because one system is down. Cached for a minute per asset.
   */
  async parameters(token: string, queryParams: any) {
    if (!token) {
      throw new HttpException("Authorization token is missing", HttpStatus.NOT_FOUND);
    }
    const given = typeof queryParams?.entityId === 'string' ? queryParams.entityId.trim() : '';
    const entityId = given.startsWith('eq.') ? given.slice(3) : given;
    if (!entityId) {
      throw new HttpException("entityId is required", HttpStatus.BAD_REQUEST);
    }

    const cacheKey = `data-viewer-parameters:${entityId}`;
    try {
      const cached = await this.redisService.getData(cacheKey);
      if (cached) return cached;
    } catch (err) {
      console.warn(`Could not read ${cacheKey} from Redis: ${err.message}`);
    }

    const headers = { Authorization: `Bearer ${token}` };
    const entity = await this.assetService.getAssetDataById(entityId, token).catch((err) => {
      console.warn(`Parameters of ${entityId}: Scorpio entity unavailable (${err.message}); listing what the time series has.`);
      return null;
    });
    const [template, latest] = await Promise.all([
      this.templateFor(entity?.type),
      this.latestRows(entityId, headers),
    ]);

    const answer = {
      parameters: buildParameterList(entity, template, latest.rows),
      // Where the reported part came from: the view, a scan of raw rows, or nowhere
      source: latest.source,
      windowDays: this.discoveryDays,
    };
    try {
      await this.redisService.saveData(cacheKey, answer, 60);
    } catch (err) {
      console.warn(`Could not cache ${cacheKey}: ${err.message}`);
    }
    return answer;
  }

  /** The asset type's template, or null when the template service cannot give one. */
  private async templateFor(type: unknown): Promise<any> {
    if (typeof type !== 'string' || !type || !this.templateSandboxUrl) return null;
    try {
      const encoded = Buffer.from(type).toString('base64');
      return (await axios.get(`${this.templateSandboxUrl}/templates/mongo-templates/type/${encoded}`)).data;
    } catch {
      return null;
    }
  }

  /**
   * The newest row of each attribute the asset reported in the window: from
   * the attribute_latest view, or, when that view does not exist yet, from a
   * bounded scan of the newest raw rows.
   */
  private async latestRows(entityId: string, headers: Record<string, string>): Promise<{ rows: LatestRow[]; source: 'view' | 'scan' | 'none' }> {
    const entity = `entityId=eq.${encodeURIComponent(entityId)}`;
    const columns = 'select=attributeId,attributeType,value,observedAt';
    try {
      const { data } = await axios.get(`${this.attributeLatestUrl}?${columns}&${entity}`, { headers });
      return { rows: Array.isArray(data) ? data : [], source: 'view' };
    } catch (err) {
      console.warn(`attribute_latest unavailable (${err.response?.status ?? err.message}); scanning the newest rows instead.`);
    }

    const since = moment().utc().subtract(this.discoveryDays, 'days').format('YYYY-MM-DDTHH:mm:ss') + '-00:00';
    const filters = [entity, `observedAt=gte.${since}`, 'order=observedAt.desc', `limit=${this.discoveryLimit}`];
    // Sub-properties are not readings. An older table without parentId refuses
    // the filter, so the scan is retried without it.
    for (const extra of [['parentId=is.null'], []]) {
      try {
        const { data } = await axios.get(`${this.timescaleUrl}?${columns}&${[...filters, ...extra].join('&')}`, { headers });
        return { rows: latestPerAttribute(Array.isArray(data) ? data : []), source: 'scan' };
      } catch (err) {
        if (err.response?.status !== HttpStatus.BAD_REQUEST) break;
      }
    }
    return { rows: [], source: 'none' };
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
