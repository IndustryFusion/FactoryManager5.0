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

import * as dotenv from 'dotenv';
import { MongooseModule } from '@nestjs/mongoose';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './endpoints/auth/auth.service';
import { SessionMiddleware } from './utils/session.middleware';
import { AuthController } from './endpoints/auth/auth.controller';
import { AlertsService } from './endpoints/alerts/alerts.service';
import { AlertsController } from './endpoints/alerts/alerts.controller';
import { PgRestController } from './endpoints/pgrest/pgrest.controller';
import { PgRestService } from './endpoints/pgrest/pgrest.service';
import { PgRestGatewayModule } from './endpoints/pgrest/pgrest.module';
import { PgRestGateway } from './endpoints/pgrest/pgrest.gatway';
import { TemplatesService } from './endpoints/templates/templates.service';
import { TemplatesController } from './endpoints/templates/templates.controller';
import { AssetController } from './endpoints/asset/asset.controller';
import { AssetService } from './endpoints/asset/asset.service';
import { FactorySiteController } from './endpoints/factory-site/factory-site.controller';
import { ShopFloorAssetsController } from './endpoints/shop-floor-assets/shop-floor-assets.controller';
import { ShopFloorController } from './endpoints/shop-floor/shop-floor.controller';
import { NonShopFloorAssetsController } from './endpoints/non-shop-floor-assets/non-shop-floor-assets.controller';
import { FileController } from './endpoints/file/file.controller';
import { FactorySiteService } from './endpoints/factory-site/factory-site.service';
import { ShopFloorAssetsService } from './endpoints/shop-floor-assets/shop-floor-assets.service';
import { ShopFloorService } from './endpoints/shop-floor/shop-floor.service';
import { NonShopFloorAssetsService } from './endpoints/non-shop-floor-assets/non-shop-floor-assets.service';
import { FileService } from './endpoints/file/file.service';
import { FactorySiteSchema, FactorySite } from './endpoints/schemas/factory-site.schema';
import { ReactFlowController } from './endpoints/react-flow/react-flow.controller';
import { ReactFlowService } from './endpoints/react-flow/react-flow.service';
import { AllocatedAssetController } from './endpoints/allocated-asset/allocated-asset.controller';
import { AllocatedAssetService } from './endpoints/allocated-asset/allocated-asset.service';
import { PowerConsumptionController } from './endpoints/power-consumption/power-consumption.controller';
import { PowerConsumptionService } from './endpoints/power-consumption/power-consumption.service';
import { CronService } from './endpoints/cron/cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { CronController } from './endpoints/cron/cron.controller';
import { ValueChangeStateController } from './endpoints/value-change-state/value-change-state.controller';
import { ValueChangeStateService } from './endpoints/value-change-state/value-change-state.service';
import { OnboardingAssetController } from './endpoints/onboarding-asset/onboarding-asset.controller';
import { OnboardingAssetService } from './endpoints/onboarding-asset/onboarding-asset.service';
import { RedisService } from './endpoints/redis/redis.service';
import { ValueChangeStateGateway } from './endpoints/value-change-state/value-change-state.gateway';
import { PowerConsumptionGateway } from './endpoints/power-consumption/power-consumption-gateway';
import { LoggerMiddleware } from './utils/logger.middleware';

dotenv.config();
const mongoURI = process.env.MONGO_URL;

@Module({
  imports: [
    MongooseModule.forRoot(mongoURI),
    MongooseModule.forFeature([
      { name: FactorySite.name, schema: FactorySiteSchema },
    ]),
    ScheduleModule.forRoot(),
    HttpModule,
    PgRestGatewayModule
  
    
  ],
  controllers: [
    AppController,
    AuthController,
    AlertsController,
    PgRestController,
    TemplatesController,
    AssetController,
    AuthController,
    FactorySiteController,
    ShopFloorAssetsController,
    ShopFloorController,
    NonShopFloorAssetsController,
    FileController,
    ReactFlowController,
    AllocatedAssetController,
    PowerConsumptionController,
    CronController,
    ValueChangeStateController,
    OnboardingAssetController
  ],
  providers: [
    AppService,
    AuthService,
    AlertsService,
    PgRestService,
    TemplatesService,
    AssetService,
    AuthService,
    FactorySiteService,
    ShopFloorAssetsService,
    ShopFloorService,
    NonShopFloorAssetsService,
    FileService,
    ReactFlowService,
    AllocatedAssetService,
    PowerConsumptionService,
    CronService,
    ValueChangeStateService,
    OnboardingAssetService,
    PgRestService,
    RedisService,
    ValueChangeStateGateway,
    PowerConsumptionGateway
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('/auth/login');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
