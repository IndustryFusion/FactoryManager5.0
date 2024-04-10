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
import { PowerConsumptionGateway } from '../power-consumption/power-consumption-gateway';
import { PowerConsumptionService } from '../power-consumption/power-consumption.service';
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
    private readonly powerConsumptionGateway: PowerConsumptionGateway,
    private readonly powerConsumptionService: PowerConsumptionService,

    ) {}
//  onModuleInit() {
//     this.handleFindAllEveryFiveSeconds();
//   }


private previousData: any = {};



private emitDataChangeToClient(data: any) {

  this.pgrestGatway.sendUpdate(data);
}

@Cron(CronExpression.EVERY_SECOND)
async handleFindAllEverySecond() {
  const credentials = await this.redisService.getTokenAndEntityId();

  if (!credentials) {
    return;
  }

  const { token, queryParams } = credentials;

  // console.log(queryParams, "gggg");

  // Check if credentials have changed
  const haveCredentialsChanged = await this.redisService.credentialsChanged(token, queryParams, queryParams.entityId);
  if (haveCredentialsChanged) {
    await this.redisService.saveData('storedData', null); // Clear stored data
    await this.redisService.saveTokenAndEntityId(token, queryParams, queryParams.entityId); // Save new credentials
  }

  try {
    // Update queryParams to limit the result to 1
    const modifiedQueryParams = { ...queryParams, limit: 5, attributeId: queryParams.attributeId !== 'eq.http://www.industry-fusion.org/fields#machine-state' ? queryParams.attributeId : undefined };
    const newData = await this.pgRestService.findAll(token, modifiedQueryParams);
    let storedData = await this.redisService.getData('storedData');

    // Set the previousData to newData the first time data is fetched
    if (Object.keys(storedData).length === 0) {
      storedData = newData;
    }

    // Compare the newly fetched data with the previously fetched data
    if (!isEqual(newData, storedData)) {
      this.emitDataChangeToClient(newData);
      await this.redisService.saveData('storedData', newData);
    }
  } catch (error) {
    // Handle error
  }
}



@Cron(CronExpression.EVERY_SECOND) 
async handleChartDataUpdate() {
  try {
    const tokenDetails = await this.redisService.getTokenAndEntityId();
    if (!tokenDetails) {
      this.logger.warn('Token details not found in Redis.');
      return;
    }

    const { token, queryParams } = tokenDetails;
    // console.log(tokenDetails, "kkkk")
    let assetId = tokenDetails.entityId;



    if (!assetId || queryParams.assetId) {
      // this.logger.warn('Asset ID not found in token details.');
      return;
    }

    // We only handle the "days" type here
    const type = 'days';
    const chartData = await this.powerConsumptionService.findChartData(assetId, type, token);
    
    // Fetch previous chart data for comparison
    const previousChartData = await this.redisService.getData(`chartData:${assetId}:${type}`);
    if (!isEqual(previousChartData, chartData)) {
      // Update the stored chart data in Redis if there is a change
      await this.redisService.saveData(`chartData:${assetId}:${type}`, chartData);
      this.emitChartDataUpdate(chartData, assetId, type);
    } else {
      this.logger.log(`No changes detected for assetId=${assetId}, type=${type}. No update emitted.`);
    }
  } catch (error) {
    this.logger.error(`Error in handleChartDataUpdate: ${error.message}`, error.stack);
  }
}

private emitChartDataUpdate(chartData: any, assetId: string, type: string) {
  // Emit only if type is 'days'
  if (type === 'days') {
    this.powerConsumptionGateway.sendPowerConsumptionUpdate({ chartData, assetId, type });
    this.logger.log(`Chart data updated for assetId=${assetId}, type=${type}`);
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