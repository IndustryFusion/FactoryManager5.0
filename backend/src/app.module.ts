import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './endpoints/auth/auth.service';
import { SessionMiddleware } from './endpoints/auth/session.middleware';
import { AuthController } from './endpoints/auth/auth.controller';
import { AlertsService } from './endpoints/alerts/alerts.service';
import { AlertsController } from './endpoints/alerts/alerts.controller';
import { PgRestController } from './endpoints/pgrest/pgrest.controller';
import { PgRestService } from './endpoints/pgrest/pgrest.service';
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

@Module({
  imports: [],
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
    FileController
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
    FileService
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('/auth/login');
  }
}
