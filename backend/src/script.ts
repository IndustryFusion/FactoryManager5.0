import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { FactorySiteService } from './endpoints/factory-site/factory-site.service';
import { ShopFloorService } from './endpoints/shop-floor/shop-floor.service';
import { AssetService } from './endpoints/asset/asset.service';
import { RedisService } from './endpoints/redis/redis.service';
import { AuthService } from './endpoints/auth/auth.service';
import axios from 'axios';

async function clearRelation() {
    const logger = new Logger('clearRelation');
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        const scorpioUrl = process.env.SCORPIO_URL;
        const factoryService = app.get(FactorySiteService);
        const shopFloorService = app.get(ShopFloorService);
        const assetService = app.get(AssetService);
        const redisService = app.get(RedisService);
        const authService = app.get(AuthService);

        let token = '';
        let tokenData = await redisService.getData('token-storage');
        if(Object(tokenData).length > 0){
            token = tokenData['accessToken'];
        } else {
            const response = await authService.login("factory_admin@industry-fusion.com", "@zN8k51@ORJg"); 
            token = response['accessToken'];
        }
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json'
        };

        // Clear ShopFloor Relation from Factory
        const factoryData = await factoryService.findAll(token);
        console.log('factoryData ',factoryData);
        for(let i = 0; i < factoryData.length; i++) {
            let eachFactory = factoryData[i];
            let hasShopFloorKey = Object.keys(eachFactory).find(key => key.includes("has"));
            eachFactory[hasShopFloorKey].object = "";
            await factoryService.removeScript(eachFactory.id, token);
            await axios.post(scorpioUrl, eachFactory, {headers});

            // Clear Asset Relation to ShopFloor For Each Factory
            const shopFloorData = await shopFloorService.findAll(eachFactory.id, token);
            for(let i = 0; i < shopFloorData.length; i++) {
                let eachShopFloor = shopFloorData[i];
                let hasAssetKey = Object.keys(eachShopFloor).find(key => key.includes("has"));
                eachShopFloor[hasAssetKey].object = "";
                await shopFloorService.remove(eachShopFloor.id, token);
                await axios.post(scorpioUrl, eachShopFloor, {headers});
            }
        }
        logger.log('Factory And ShopFloor Relations Deleted Successfully');

        //Clear Asset Relations
        const assetData = await assetService.getAssetData(token);
        console.log('assetData ',assetData);
        for(let i = 0; i < assetData.length; i++) {
            let eachAsset = assetData[i];
            Object.keys(eachAsset).map(key => {
                if(key.includes("has")) {
                    eachAsset[key].object = "";
                }
            })
            await assetService.deleteAssetById(eachAsset.id, token);
            await axios.post(scorpioUrl, eachAsset, {headers});
        }
        logger.log('Asset Relations Deleted Successfully');
        logger.log('Function Ran Successfully');
        await app.close();
    } catch(err) {
        logger.error(err);
    }
}

clearRelation().catch(err => {
    console.error('Seeding failed', err);
    process.exit(1);
});