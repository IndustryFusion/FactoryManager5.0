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
      let allocatedAssets = await this.allocatedAssetService.getGlobalAllocatedAssets(token);
      if (Array.isArray(allocatedAssets) && allocatedAssets.length > 0) {
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
        if(allocatedAssets.length > 0 && allocatedAssets !== "json-ld-1.1"){
          assetIds = assetIds.filter(assetId => assetId !== allocatedAssets);
        }
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