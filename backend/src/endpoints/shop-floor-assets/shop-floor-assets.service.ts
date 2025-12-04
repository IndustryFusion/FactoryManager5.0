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

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';

@Injectable()
export class ShopFloorAssetsService {
  constructor(private readonly assetService: AssetService, private readonly shopFloorService: ShopFloorService) {}

  async findAll(id: string, token: string) {
    try {
      let shopFloorData = await this.shopFloorService.findOne(id, token);
      let assetIds = shopFloorData["http://www.industry-fusion.org/schema#hasAsset"];
      let hasAssetArr = [];
      if(Array.isArray(assetIds) && assetIds.length > 0) {
        for(let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i].object;
          if(id.includes('urn')) {
            let assetData = await this.assetService.getAssetDataById(id, token);
            hasAssetArr.push(assetData);
          }
        }
      } else if(assetIds.object.includes('urn')) {
        let assetData = await this.assetService.getAssetDataById(assetIds.object, token);
        hasAssetArr.push(assetData);
      }
      return hasAssetArr; 
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    } 
  }
}