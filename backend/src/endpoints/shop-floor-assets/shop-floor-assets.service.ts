import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';

@Injectable()
export class ShopFloorAssetsService {
  constructor(private readonly assetService: AssetService, private readonly shopFloorService: ShopFloorService) {}

  async findAll(id: string, token: string) {
    try {
      let shopFloorData = await this.shopFloorService.findOne(id, token);
      let assetIds = shopFloorData["http://www.industry-fusion.org/schema#hasAsset"].object;
      let hasAssetArr = [];
      if(Array.isArray(assetIds) && assetIds.length > 0) {
        for(let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          if(id.includes('urn')) {
            let assetData = await this.assetService.getAssetDataById(id, token);
            hasAssetArr.push(assetData);
          }
        }
      } else if(assetIds.includes('urn')) {
        let assetData = await this.assetService.getAssetDataById(id, token);
        hasAssetArr.push(assetData);
      }
      return hasAssetArr; 
    } catch(err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    } 
  }
}
