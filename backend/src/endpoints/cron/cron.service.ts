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

import { Injectable , Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RealtimePresenceService } from '../realtime/realtime-presence.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AssetService } from '../asset/asset.service';
import { HttpService } from '@nestjs/axios';
import { PgRestService } from '../pgrest/pgrest.service';
import axios, { AxiosResponse } from 'axios';
import { RedisService } from '../redis/redis.service';
import { isEqual } from 'lodash';
import { PgRestGateway } from '../pgrest/pgrest.gatway';
import { ValueChangeStateService } from '../value-change-state/value-change-state.service';
import { ValueChangeStateGateway } from '../value-change-state/value-change-state.gateway';
import { TokenService } from '../session/token.service';
import { linkTargets } from '../../utils/ngsi-ld';

@Injectable()

export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly reactFlowService: ReactFlowService,
    private readonly factorySiteService: FactorySiteService,
    private readonly shopFloorService: ShopFloorService,
    private readonly assetService: AssetService,
    private readonly pgRestService: PgRestService,
    private readonly redisService : RedisService,
    private readonly pgrestGatway : PgRestGateway,
    private readonly valueChangeStateService : ValueChangeStateService,
    private readonly valueChangeStateGateway : ValueChangeStateGateway,
    private readonly tokenService: TokenService,
    private readonly presence: RealtimePresenceService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  /**
   * The two realtime jobs below only produce WebSocket pushes, so they are
   * created when the first frontend connects and destroyed after the last one
   * disconnects. Their schedules and bodies are unchanged — previously they ran
   * every 5s / every minute forever (~18,700 executions a day) and bailed out
   * early, after two Redis reads per tick.
   */
  private static readonly REALTIME_JOBS = [
    { name: 'live-data-refresh', expression: CronExpression.EVERY_5_SECONDS, run: 'handleFindAllEverySecond' },
    { name: 'machine-state-refresh', expression: '* * * * *', run: 'handleMachineStateRefresh' },
  ] as const;

  onModuleInit() {
    this.presence.onActiveChange((active) =>
      active ? this.startRealtimeJobs() : this.stopRealtimeJobs(),
    );
  }

  onModuleDestroy() {
    this.stopRealtimeJobs();
  }

  private startRealtimeJobs() {
    for (const job of CronService.REALTIME_JOBS) {
      if (this.schedulerRegistry.doesExist('cron', job.name)) continue;
      const handler = this[job.run].bind(this);
      const cronJob = new CronJob(job.expression, () => {
        // A rejection escaping a scheduled job is an unhandled rejection, which
        // terminates the process. Neither job body guards all of its awaits.
        Promise.resolve(handler()).catch((err) =>
          this.logger.error(`${job.name} failed: ${err?.message}`, err?.stack),
        );
      });
      this.schedulerRegistry.addCronJob(job.name, cronJob as any);
      cronJob.start();
      this.logger.log(`Started ${job.name} (${job.expression})`);
    }
  }

  private stopRealtimeJobs() {
    for (const job of CronService.REALTIME_JOBS) {
      if (!this.schedulerRegistry.doesExist('cron', job.name)) continue;
      this.schedulerRegistry.deleteCronJob(job.name);
      this.logger.log(`Stopped ${job.name}`);
    }
  }

  private emitDataChangeToClient(data: any) {
    this.pgrestGatway.sendUpdate(data);
  }

  // Scheduled dynamically by startRealtimeJobs() — see REALTIME_JOBS.
  async handleFindAllEverySecond() {
    // Retrieve stored data and query parameters from Redis
    let storedData = await this.redisService.getData('storedData');
    let storedQueryParams = await this.redisService.getData('storedDataQueryParams');

    if (storedQueryParams && storedQueryParams.intervalType !== 'live') {
      console.log('⏭️  Skipping cron - not in live mode');
      return; // Only proceed if the interval type is 'live'
    }

    if (!storedData || storedData.length == 0) {
      console.log('⏭️  Skipping cron - no stored data in Redis');
      return;
    }

    const { entityId, attributeId } = storedData[0];
    const modifiedQueryParams = {
      limit: 1,
      order: 'observedAt.desc',
      entityId: `eq.${entityId}`,
      attributeId: `eq.${attributeId}` 
    };

    try {
      console.log("🔄 Getting token for live data update")
      let token = await this.tokenService.getToken();
      console.log("🔄 Fetching live data from DB with params:", modifiedQueryParams)
      const newData = await this.pgRestService.findLiveData(token, modifiedQueryParams);
      console.log("✅ Emitting data to WebSocket clients:", newData.length, "records")
      if (newData) {
        this.emitDataChangeToClient(newData);
      }
    } catch (error) {
      console.error("❌ Error during data fetch:", error);
    }
  }

  // Scheduled dynamically by startRealtimeJobs() — see REALTIME_JOBS.
  async handleMachineStateRefresh(){
    let machineStateParams = await this.redisService.getData('machine-state-params');
    if(machineStateParams && machineStateParams.type == 'days' && machineStateParams.attributeId){
      let newData = await this.valueChangeStateService.findAll(machineStateParams.assetId, machineStateParams.attributeId, machineStateParams.type, machineStateParams.token);
      let storedData = await this.redisService.getData('machine-state-data');
      if(storedData){
        if(!isEqual(newData, storedData)){
          await this.redisService.saveData('machine-state-data',newData);
          // call web socket
          this.valueChangeStateGateway.sendUpdate(newData);
        }
      }else{
        await this.redisService.saveData('machine-state-data',newData);
      }
    }
  }

  // Existing method that runs at the end of the day
  @Cron('0 0 * * *')
  async handleCron() {
    const url = 'http://localhost:4002/cron'; // Replace with your actual URL
    this.httpService.get('http://localhost:4002/cron').subscribe({
      next: (response: AxiosResponse<any>) => {
        this.logger.log(`Validate Scorpio with ReactFlow is Successfull`);
      },
      error: (error: any) => {
        this.logger.error('Error during Validate Scorpio with ReactFlow', error);
      },
    });
  }

  async validateScript(token: string) {
    try {
      let factoryData = await this.factorySiteService.findAll(token);
      for(let i = 0; i < factoryData.length; i++){
        let factoryId = factoryData[i].id;
        let reactData = await this.reactFlowService.findOne(factoryId);
        if(reactData && reactData.factoryData) {
          let edges = reactData.factoryData['edges'];
          let assetData = [];
          for (const shopFloorId of linkTargets(factoryData[i]['http://www.industry-fusion.org/schema#hasShopFloor'])) {
            let shopFloorData = await this.shopFloorService.findOne(shopFloorId, token);
            for (const assetId of linkTargets(shopFloorData['http://www.industry-fusion.org/schema#hasAsset'])) {
              let response = await this.assetService.getAssetDataById(assetId, token);
              assetData.push(response);
            }
          }

          if(assetData.length > 0){
            for(let j = 0; j < assetData.length; j++){
              for(let key in assetData[j]) {
                if(key.includes('has')){
                  // Every link target of the product must still have its edge in
                  // the factory layout; otherwise rebuild the layout.
                  const targets = linkTargets(assetData[j][key]);
                  const drawn = targets.filter((target) =>
                    edges.some((edge) => edge.source.includes(assetData[j].id) && edge.target.includes(target)));
                  if(drawn.length !== targets.length){
                    let response = await this.reactFlowService.findFactoryAndShopFloors(factoryId, token);
                    return response;
                  }
                }
              }
            }
          }
        }
      }
    } catch(err){
      return err;
    }
  }
}