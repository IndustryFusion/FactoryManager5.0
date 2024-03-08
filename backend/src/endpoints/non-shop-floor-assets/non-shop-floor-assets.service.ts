import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';

@Injectable()
export class NonShopFloorAssetsService {
  constructor(
    private readonly assetService: AssetService,
    private readonly allocatedAssetService: AllocatedAssetService,
  ) {}

  async findAll(id: string, token: string) {
    try {
      let assetIds = await this.assetService.getAssetIds(token);
      console.log('assetIds ', assetIds);
      let allocatedAssets = await this.allocatedAssetService.getAllocatedAssets(token);
      if (allocatedAssets.length > 0) {
        const filteredArray = [];
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          if (!allocatedAssets.includes(id)) {
            const assetData = await this.assetService.getAssetDataById(
              id,
              token,
            );
            const filteredObject = {
              id,
              product_name: assetData['http://www.industry-fusion.org/schema#product_name'],
              asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']
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
          const assetData = await this.assetService.getAssetDataById(
            id,
            token,
          );
          const filteredObject = {
            id,
            product_name: assetData['http://www.industry-fusion.org/schema#product_name'],
            asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']
          };
          for (const key in assetData) {
            if (key.includes('has')) {
              filteredObject[key] = assetData[key];
            }
          }
          filteredArray.push(filteredObject);
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