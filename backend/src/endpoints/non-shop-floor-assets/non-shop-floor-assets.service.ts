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
import { Request } from 'express';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';

@Injectable()
export class NonShopFloorAssetsService {
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCacheModel: Model<FactoryPdtCache>,
    private readonly assetService: AssetService,
    private readonly allocatedAssetService: AllocatedAssetService,
  ) {}
  
  async findAll(company_ifric_id: string) {
    try {
      return await this.factoryPdtCacheModel.aggregate([
        {
          $match: { company_ifric_id, factory_site: "" }
        },
        {
          $project: {
            _id: 0,
            id: "$_id",
            product_name: 1,
            asset_category: 1,
            asset_serial_number: 1
          }
        }
      ])
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async findByProductType(company_ifric_id: string, product_type: string) {
    try {
      return this.factoryPdtCacheModel.aggregate([
        {
          $match: { company_ifric_id, type: product_type, factory_site: "" }
        },
        {
          $project: {
            product_name: 1,
            assasset_category: 1,
            asset_serial_number: 1
          }
        }
      ])
    } catch (err) {
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