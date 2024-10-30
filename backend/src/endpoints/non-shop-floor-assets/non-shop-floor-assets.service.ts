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
      // Get all asset IDs and remove duplicates
      let assetIds = await this.assetService.getAssetIds(token) || [];
      assetIds = [...new Set(assetIds)].filter(Boolean); // Remove duplicates and falsy values
      console.log("Unique available assets:", assetIds);

      // Get allocated assets (now returns array of IDs directly)
      const allocatedAssetIds = await this.allocatedAssetService.getGlobalAllocatedAssets(token);
      console.log("Allocated assets to exclude:", allocatedAssetIds);

      // Filter out allocated assets and special cases, ensure uniqueness
      const availableAssetIds = [...new Set(
        assetIds.filter(assetId => 
          assetId && 
          !allocatedAssetIds.includes(assetId) && 
          assetId !== "json-ld-1.1"
        )
      )];
      console.log("Filtered unique available assets:", availableAssetIds);

      // Get details for available assets
      const processedIds = new Set(); // Track processed IDs
      const filteredArray = [];

      for (let id of availableAssetIds) {
        try {
          // Skip if we've already processed this ID
          if (processedIds.has(id)) {
            console.log(`Skipping duplicate asset ID: ${id}`);
            continue;
          }

          const assetData = await this.assetService.getAssetDataById(id, token);
          if (!assetData) {
            console.log(`No data found for asset ID: ${id}`);
            continue;
          }

          // Create filtered object with required properties
          const filteredObject = {
            id,
            product_name: '',
            asset_category: ''
          };

          // Find and set product name
          const productNameKey = Object.keys(assetData).find(key => key?.includes("product_name"));
          if (productNameKey) {
            filteredObject.product_name = assetData[productNameKey];
          }

          // Find and set asset category
          const assetCategoryKey = Object.keys(assetData).find(key => key?.includes("asset_category"));
          if (assetCategoryKey) {
            filteredObject.asset_category = assetData[assetCategoryKey];
          }

          // Add properties that include 'has'
          Object.entries(assetData).forEach(([key, value]) => {
            if (key?.includes('has')) {
              filteredObject[key] = value;
            }
          });

          // Mark this ID as processed
          processedIds.add(id);
          
          filteredArray.push(filteredObject);
        } catch (innerError) {
          console.error(`Error processing asset ID ${id}:`, innerError.message);
          continue;
        }
      }

      console.log(`Successfully processed ${filteredArray.length} unique non-shop floor assets`);
      return filteredArray;

    } catch (err) {
      console.error('Error in findAll:', err);
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }
}