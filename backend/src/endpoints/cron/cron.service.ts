import { Injectable , Logger, OnModuleInit} from '@nestjs/common';
import { Cron,CronExpression  } from '@nestjs/schedule';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AssetService } from '../asset/asset.service';
import { HttpService } from '@nestjs/axios';
import { PgRestService } from '../pgrest/pgrest.service';
import axios, { AxiosResponse } from 'axios';
import { TemplateDescriptionDto } from '../templates/dto/templateDescription.dto';
import { RedisService } from '../redis/redis.service';
import { isEqual } from 'lodash';
import { Server } from 'socket.io';
import { WebSocketServer } from '@nestjs/websockets';
import { PgRestGateway } from '../pgrest/pgrest.gatway';
import { ValueChangeStateService } from '../value-change-state/value-change-state.service';
import { ValueChangeStateGateway } from '../value-change-state/value-change-state.gateway';
import { PowerConsumptionGateway } from '../power-consumption/power-consumption-gateway';
import { PowerConsumptionService } from '../power-consumption/power-consumption.service';
import * as moment from 'moment';

@Injectable()

export class CronService  
// implements OnModuleInit {
  {
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
    private readonly powerConsumptionGateway: PowerConsumptionGateway,
    private readonly powerConsumptionService: PowerConsumptionService,
    ) {}

private emitDataChangeToClient(data: any) {

  this.pgrestGatway.sendUpdate(data);
}

@Cron(CronExpression.EVERY_5_SECONDS)
async handleFindAllEverySecond() {
  // Retrieve token and query parameters from Redis
  const credentials = await this.redisService.getTokenAndEntityId();
  const { token, queryParams } = credentials;
  await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId, queryParams.attributeId);

  // Retrieve stored data and query parameters from Redis
  let storedData = await this.redisService.getData('storedData');
  let storedQueryParams = await this.redisService.getData('storedDataQueryParams');

  //console.log("storedQueryParams", storedQueryParams)
  
  if (storedQueryParams && storedQueryParams.intervalType !== 'live') {
    return; // Only proceed if the interval type is 'live'
  }

  if (!storedData || storedData.length == 0) {
    // console.log("No data to process, exiting...");
    return;
  }

  const { entityId, attributeId } = storedData[0];
  //console.log(storedData, "storeddata")
  const modifiedQueryParams = {
    limit: 1,
    order: 'observedAt.desc',
    entityId: `eq.${entityId}`,
    attributeId: `eq.${attributeId.replace('#', '%23')}` 
  };

  try {

    const newData = await this.pgRestService.findLiveData(token, modifiedQueryParams);
    if (newData) {
      this.emitDataChangeToClient(newData);
    } else {
    }
  } catch (error) {
    console.error("Error during data fetch:", error);
  }
}

@Cron('* * * * *')
async handleChartDataUpdate() {
  try {
    
    const credentials = await this.redisService.getTokenAndEntityId();
    if (!credentials) {
      return;
    }
    const { token, queryParams } = credentials;
    const { assetId, type } = queryParams;
    const dateToCheck = moment(queryParams.endTime);
    const currentDate = moment().startOf('day');
    const isCurrentDate = dateToCheck.isSame(currentDate, 'day');
    if(type == 'days' && isCurrentDate){
      const redisKey = `chartData:${assetId}:${type}`;
      const previousChartData = await this.redisService.getData(redisKey);
      const modifiedQueryParams = { ...queryParams, limit: 1  };
      const newChartData = await this.powerConsumptionService.findOne(modifiedQueryParams, token);
      if(previousChartData){
        if (!isEqual(previousChartData, newChartData)) {
          await this.redisService.saveData(redisKey, newChartData);
          this.emitChartDataUpdate(newChartData, assetId, type);
        }
      }else{
        await this.redisService.saveData(redisKey, newChartData);
        this.emitChartDataUpdate(newChartData, assetId, type);
      }
    }
  } catch (error) {
    this.logger.error('Error during chart data update', error);
  }
}

private emitChartDataUpdate(chartData: any, assetId: string, type: string) {
  this.powerConsumptionGateway.sendPowerConsumptionUpdate({ chartData, assetId, type });
  this.logger.log(`Chart data updated for assetId=${assetId}, type=${type}`);
}

@Cron('* * * * *')
async handleMachineStateRefresh(){
  let machineStateParams = await this.redisService.getData('machine-state-params');
  if(machineStateParams && machineStateParams.type == 'days'){
    let newData = await this.valueChangeStateService.findAll(machineStateParams.assetId, machineStateParams.type, machineStateParams.token);
    let storedData = await this.redisService.getData('machine-state-data');
    if(storedData){
      if(!isEqual(newData, storedData)){
        await this.redisService.saveData('machine-state-data',newData);
        // call web socket
        this.valueChangeStateGateway.sendUpdate(newData);
      }
    }else{
      console.log('inside else condition');
      await this.redisService.saveData('machine-state-data',newData);
    }
  }
}

  // Existing method that runs at the end of the day
  @Cron('0 0 * * *')
  async handleCron() {
    console.log('time ', new Date());
    

    const url = 'http://localhost:4002/cron'; // Replace with your actual URL

    // axios.get(url, { 
    //   headers: {
    //     "Content-Type": "application/json",
    //     Accept: "application/json",
    //   },
    //   withCredentials: true }).then((response: AxiosResponse) => {
    //   console.log('Response:', response.data);
    // }).catch((error) => {
    //   console.error('Error:', error);
    // });
    // const response = await this.httpService.get('http://localhost:4002/cron');

    this.httpService.get('http://localhost:4002/cron').subscribe({
      next: (response: AxiosResponse<any>) => {
        console.log('Response:', response.data);
      },
      error: (error: any) => {
        console.error('Error:', error);
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
          console.log('factoryData ',factoryData[i]);
          let edges = reactData.factoryData['edges'];
          console.log('edges ',edges);
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
          console.log('assetData ',assetData);

          if(assetData.length > 0){
            for(let j = 0; j < assetData.length; j++){
              for(let key in assetData[j]) {
                if(key.includes('has')){
                  let templateKey: string = key.split('http://www.industry-fusion.org/schema#').pop();
                  if(Array.isArray(assetData[j][key]) && assetData[j][key][0].class == 'material'){
                    let materialArr = assetData[j][key];
                    let count = 0;
                    for(let idx = 0; idx < materialArr.length; idx++){
                      let target = materialArr[idx].object;
                      for(let k = 0; k < edges.length; k++){
                        console.log('source ',edges[k].source);
                        console.log('check source ',assetData[j].id);
                        console.log('target ',edges[k].target);
                        console.log('check target ',target);
                        if(edges[k].source.includes(assetData[j].id) && edges[k].target.includes(target)){
                          count++;
                        }
                      }
                    }
                    if(materialArr.length !== count){
                      console.log('materialArr length ',materialArr);
                      console.log('count check ',count);
                      let response = await this.reactFlowService.findFactoryAndShopFloors(factoryId, token);
                      return response;
                    }
                  } else if(assetData[j][key].object !== 'json-ld-1.1' && assetData[j][key].object.includes('urn') && assetData[j][key].class == 'material'){
                    let flag = false;
                    let target = assetData[j][key].object;
                    console.log('target ',target);
                    for(let k = 0; k < edges.length; k++){
                      console.log('source ',edges[k].source);
                      console.log('check source ',assetData[j].id);
                      console.log('target ',edges[k].target);
                      console.log('check target ',target);
                      if(edges[k].source.includes(assetData[j].id) && edges[k].target.includes(target)){
                        console.log('inside check');
                        flag = true;
                      }
                    }
                    console.log('flag check ',flag);
                    if(!flag){
                      let response = await this.reactFlowService.findFactoryAndShopFloors(factoryId, token);
                      console.log('response ',response);
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