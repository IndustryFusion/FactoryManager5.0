import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateFactoryPdtCacheDto, UpdateFactoryPdtCacheDto } from './dto/create-factory-pdt-cache.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';

import { upstreamMessage } from '../../utils/upstream-error';
@Injectable()
export class FactoryPdtCacheService implements OnModuleInit {
  private readonly logger = new Logger(FactoryPdtCacheService.name);
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCacheModel: Model<FactoryPdtCache>,
  ){}
  private readonly ifxPlatformUrl = process.env.IFX_PLATFORM_BACKEND_URL;

  async onModuleInit() {
    try {
      // Backfill product_image for rows cached while it was a single string. IFX now sends
      // a list, so "NULL"/"" become [] and any other string s becomes [s].
      const result = await this.factoryPdtCacheModel.updateMany(
        { product_image: { $type: 'string' } },
        [{
          $set: {
            product_image: {
              $cond: [{ $in: ["$product_image", ["NULL", ""]] }, [], ["$product_image"]]
            }
          }
        }]
      );
      if (result.modifiedCount > 0) {
        console.log(`Migration: converted 'product_image' to a list on ${result.modifiedCount} cached product(s)`);
      }
    } catch (error) {
      console.error('Error during factory-pdt-cache product_image migration:', error);
    }
  }

  create(createFactoryPdtCacheDto: CreateFactoryPdtCacheDto) {
    return 'This action adds a new factoryPdtCache';
  }

  async findAll(company_ifric_id: string) {
    try {
      const rows = await this.factoryPdtCacheModel.find({company_ifric_id}).sort({_id: -1, "meta_data.created_at": -1});
      // What the Assets table shows: FactoryManager's copy of IFX's product list.
      this.logger.log(`[assets-table ${company_ifric_id}] ${rows.length} product row(s)`);
      return rows;
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
  /**
   * Takes a shop floor off the assets that are no longer on it, and lets an
   * asset go once it is on no shop floor at all.
   *
   * The counterpart to updateFactoryAndShopFloor, which only ever adds. With
   * nothing to remove a shop floor, an asset kept `factory_site` forever —
   * and the "available assets" list only shows rows whose `factory_site` is
   * empty, so a removed asset appeared in no list at all and could never be
   * placed again.
   *
   * `keepAssetIds` are the assets still on the floor; everything else that
   * still claims it is released. Safe with an empty list, which is what a
   * deleted shop floor and an emptied one both pass.
   */
  async releaseFromShopFloor(shopFloorId: string, keepAssetIds: string[] = []) {
    try {
      return await this.factoryPdtCacheModel.updateMany(
        { shop_floor: shopFloorId, id: { $nin: keepAssetIds } },
        [
          {
            $set: {
              shop_floor: {
                $setDifference: [{ $ifNull: ['$shop_floor', []] }, [shopFloorId]],
              },
              isCacheUpdated: true,
            },
          },
          {
            // A second stage, so this sees the list the first one just wrote.
            $set: {
              factory_site: {
                $cond: [{ $eq: ['$shop_floor', []] }, '', '$factory_site'],
              },
            },
          },
        ],
      );
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateFactoryAndShopFloor(data: Record<string, any>) {
    try {
      const shopFloors = Array.isArray(data.shop_floor) ? data.shop_floor : [data.shop_floor];
      return await this.factoryPdtCacheModel.updateMany(
        {id: { $in: data.assetIds }}, 
        [
          {
            $set: {
              factory_site: data.factory_site,
              isCacheUpdated: true,
              shop_floor: {
                $cond: [
                  { $isArray: "$shop_floor" },
                  { $setUnion: ["$shop_floor", shopFloors] },
                  { $cond: [
                    { $or: [{ $eq: ["$shop_floor", ""] }, { $eq: ["$shop_floor", null] }] },
                    shopFloors,
                    { $setUnion: [["$shop_floor"], shopFloors] }
                  ]}
                ]
              }
            }
          }
        ],
        {new: true}
      )
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
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
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}

