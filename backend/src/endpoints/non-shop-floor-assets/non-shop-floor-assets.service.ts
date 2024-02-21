import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';

@Injectable()
export class NonShopFloorAssetsService {
  constructor(
    private readonly factorySiteService: FactorySiteService,
    private readonly assetService: AssetService,
    private readonly shopFloorService: ShopFloorService,
  ) {}

  async findAll(id: string, token: string) {
    try {
      let assetIds = await this.assetService.getAssetIds(token);
      console.log('assetIds ', assetIds);
      let factoryData = await this.factorySiteService.findOne(id, token);
      let shopFloorIds = factoryData['http://www.industry-fusion.org/schema#hasShopFloor'];
      console.log('shopFloorIds ', shopFloorIds);
      let hasAssetArr = [];
      if (Array.isArray(shopFloorIds) && shopFloorIds.length > 0) {
        for (let i = 0; i < shopFloorIds.length; i++) {
          let id = shopFloorIds[i].object;
          if (id.includes('urn')) {
            let shopFloorData = await this.shopFloorService.findOne(id, token);
            console.log('shopFloorData ', shopFloorData);
            let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
            if (Array.isArray(hasAsset) && hasAsset.length > 0) {
              hasAsset.forEach((data) => {
                hasAssetArr.push(data.Object);
              })
            } else if (hasAsset.object.includes('urn')) {
              hasAssetArr = [...hasAssetArr, hasAsset.object];
            }
          }
        }
      } else if (shopFloorIds.object.includes('urn')) {
        let shopFloorData = await this.shopFloorService.findOne(
          shopFloorIds.object,
          token,
        );
        console.log('shopFloorData ', shopFloorData);
        let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
        if (Array.isArray(hasAsset) && hasAsset.length > 0) {
          hasAsset.forEach((data) => {
            hasAssetArr.push(data.Object);
          })
        } else if (hasAsset.object.includes('urn')) {
          hasAssetArr = [...hasAssetArr, hasAsset.object];
        }
      }
      console.log(hasAssetArr, ' hasArray');
      if (hasAssetArr.length > 0) {
        const filteredArray = [];
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          if (!hasAssetArr.includes(id)) {
            const assetData = await this.assetService.getAssetDataById(
              id,
              token,
            );
            const filteredObject = {
              id,
              product_name:
                assetData['http://www.industry-fusion.org/schema#product_name'],
            };
            for (const key in assetData) {
              if (key.includes('has')) {
                filteredObject[key] = assetData[key];
              }
            }
            filteredArray.push(filteredObject);
          }
        }
        return filteredArray;
      } else {
        const filteredArray = [];
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          if (!hasAssetArr.includes(id)) {
            const assetData = await this.assetService.getAssetDataById(
              id,
              token,
            );
            const filteredObject = {
              id,
              product_name:
                assetData['http://www.industry-fusion.org/schema#product_name'],
            };
            for (const key in assetData) {
              if (key.includes('has')) {
                filteredObject[key] = assetData[key];
              }
            }
            filteredArray.push(filteredObject);
          }
        }
        return filteredArray;
      }
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }
}