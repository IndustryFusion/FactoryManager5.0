import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';

@Injectable()
export class NonShopFloorAssetsService {
  constructor(private readonly factorySiteService: FactorySiteService, private readonly assetService: AssetService, private readonly shopFloorService: ShopFloorService) {}

  async findAll(id: string, token: string) {
    try {
      let assetData = await this.assetService.getAssetIds(token);
      let factoryData = await this.factorySiteService.findOne(id, token);
      let shopFloorIds = factoryData["http://www.industry-fusion.org/schema#hasShopFloor"].object;
      let hasAssetArr = [];
      if(Array.isArray(shopFloorIds) && shopFloorIds.length > 0) {
        for(let i = 0; i < shopFloorIds.length; i++) {
          let id = shopFloorIds[i];
          if(id.includes('urn')) {
            let shopFloorData = await this.shopFloorService.findOne(id, token);
            console.log('shopFloorData ',shopFloorData);
            let hasAsset = shopFloorData["http://www.industry-fusion.org/schema#hasAsset"].object;
            if(Array.isArray(hasAsset) && hasAsset.length > 0) {
              hasAssetArr = [...hasAssetArr, ...hasAsset];
            } else if(hasAsset.includes('urn')) {
              hasAssetArr = [...hasAssetArr, hasAsset];
            }
          }
        }
      }
      if(hasAssetArr.length > 0) {
        const filteredArray = assetData.filter(value => !hasAssetArr.includes(value));
        return filteredArray;
      } else {
        return hasAssetArr;
      } 
    } catch(err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    } 
  }
}
