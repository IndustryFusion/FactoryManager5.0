import { Injectable } from '@nestjs/common';
import { CreateFactoryPdtCacheDto, UpdateFactoryPdtCacheDto } from './dto/create-factory-pdt-cache.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';

@Injectable()
export class FactoryPdtCacheService {
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCacheModel: Model<FactoryPdtCache>,
  ){}
  private readonly ifxPlatformUrl = process.env.IFX_PLATFORM_BACKEND_URL;

  create(createFactoryPdtCacheDto: CreateFactoryPdtCacheDto) {
    return 'This action adds a new factoryPdtCache';
  }

  async findAll(company_ifric_id: string) {
    try {
      return await this.factoryPdtCacheModel.find({company_ifric_id}).sort({_id: -1, "meta_data.created_at": -1});
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(err.response.data.title || err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
  async updateFactoryAndShopFloor(data: Record<string, any>) {
    try {
      const shopFloors = Array.isArray(data.shop_floor) ? data.shop_floor : [data.shop_floor];
      return await this.factoryPdtCacheModel.updateMany({id: { $in: data.assetIds }}, { factory_site: data.factory_site, $addToSet: { shop_floor: { $each: shopFloors } } }, {new: true})
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(err.response.data.title || err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async updateProductLine(data: Record<string, string[]>) {
    try {
      await Promise.all(
        Object.entries(data).map(async ([subFlowId, assetIds]) => {
          // need to remove product_line for assets removed from the production line
          // filter out assets which are matching with current product_line but not present in react flow
          const matchingAssetData = await this.factoryPdtCacheModel.find({product_line: subFlowId}).lean();
          if(matchingAssetData.length) {
            const matchingAssetIds = matchingAssetData.map(asset => asset.id);
            const filteredAssetIds = matchingAssetIds.filter(id => !assetIds.includes(id));
            await this.factoryPdtCacheModel.updateMany(
              {id: {$in: filteredAssetIds}},
              { $pull: { product_line: subFlowId } }
            )
          }

          await this.factoryPdtCacheModel.updateMany(
            { id: { $in: assetIds } },
            { $addToSet: { product_line: subFlowId } },
            { new: true }
          )
        })
      );
      return {
        status: 204,
        message: "product_line updated successfully"
      }
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(err.response.data.title || err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}

