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

import { Injectable , Logger, OnModuleInit} from '@nestjs/common';
import { Cron,CronExpression  } from '@nestjs/schedule';
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

@Injectable()

export class CronService  {
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
    private readonly tokenService: TokenService
  ) {}

  private emitDataChangeToClient(data: any) {
    this.pgrestGatway.sendUpdate(data);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleFindAllEverySecond() {
    // Retrieve stored data and query parameters from Redis
    let storedData = await this.redisService.getData('storedData');
    let storedQueryParams = await this.redisService.getData('storedDataQueryParams');

    if (storedQueryParams && storedQueryParams.intervalType !== 'live') {
      return; // Only proceed if the interval type is 'live'
    }

    if (!storedData || storedData.length == 0) {
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
      let token = await this.tokenService.getToken();
      const newData = await this.pgRestService.findLiveData(token, modifiedQueryParams);
      if (newData) {
        this.emitDataChangeToClient(newData);
      }
    } catch (error) {
      console.error("Error during data fetch:", error);
    }
  }

  @Cron('* * * * *')
  async handleMachineStateRefresh(){
    let machineStateParams = await this.redisService.getData('machine-state-params');
    if(machineStateParams && machineStateParams.type == 'days'){
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
          let shopFloorIds = factoryData[i]['http://www.industry-fusion.org/schema#hasShopFloor'];
          let assetData = [];
          if(shopFloorIds && Array.isArray(shopFloorIds) && shopFloorIds.length > 0){
            for (let i = 0; i < shopFloorIds.length; i++) {
              let id = shopFloorIds[i].object;
              if (id.includes('urn')) {
                let shopFloorData = await this.shopFloorService.findOne(id, token);
                let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
                if (hasAsset && Array.isArray(hasAsset) && hasAsset.length > 0) {
                  for(let j=0; j < hasAsset.length; j++){
                    let assetId = hasAsset[j].object;
                    let response = await this.assetService.getAssetDataById(assetId, token);
                    assetData.push(response);
                  }
                } else if (hasAsset && hasAsset.object.includes('urn')) {
                  let assetId = hasAsset.object;
                  let response = await this.assetService.getAssetDataById(assetId, token);
                  assetData.push(response);
                }
              }
            }
          } else if(shopFloorIds && shopFloorIds.object.includes('urn')) {
            let shopFloorData = await this.shopFloorService.findOne(shopFloorIds.object, token);
            let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
            if (hasAsset && Array.isArray(hasAsset) && hasAsset.length > 0) {
              for(let j=0; j < hasAsset.length; j++){
                let assetId = hasAsset[j].object;
                let response = await this.assetService.getAssetDataById(assetId, token);
                assetData.push(response);
              }
            } else if (hasAsset && hasAsset.object.includes('urn')) {
              let assetId = hasAsset.object;
              let response = await this.assetService.getAssetDataById(assetId, token);
              assetData.push(response);
            }
          }

          if(assetData.length > 0){
            for(let j = 0; j < assetData.length; j++){
              for(let key in assetData[j]) {
                if(key.includes('has')){
                  if(Array.isArray(assetData[j][key]) ){
                    let materialArr = assetData[j][key];
                    let count = 0;
                    for(let idx = 0; idx < materialArr.length; idx++){
                      let target = materialArr[idx].object;
                      for(let k = 0; k < edges.length; k++){
                        if(edges[k].source.includes(assetData[j].id) && edges[k].target.includes(target)){
                          count++;
                        }
                      }
                    }
                    if(materialArr.length !== count){
                      let response = await this.reactFlowService.findFactoryAndShopFloors(factoryId, token);
                      return response;
                    }
                  } else if(assetData[j][key].object !== 'json-ld-1.1' && assetData[j][key].object.includes('urn')){
                    let flag = false;
                    let target = assetData[j][key].object;
                    for(let k = 0; k < edges.length; k++){
                      if(edges[k].source.includes(assetData[j].id) && edges[k].target.includes(target)){
                        flag = true;
                      }
                    }
                    if(!flag){
                      let response = await this.reactFlowService.findFactoryAndShopFloors(factoryId, token);
                      return response;
                    }
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