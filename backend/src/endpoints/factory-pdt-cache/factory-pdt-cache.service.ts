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
      const ifxHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      const response = await axios.get(`${this.ifxPlatformUrl}/purchased-pdt-cache/${company_ifric_id}`, {headers: ifxHeaders});
      const purchasedPdtData = response.data;
      const bulkOps = purchasedPdtData.map((asset: CreateFactoryPdtCacheDto) => {
        delete asset._id;
        return {
          updateOne: {
            filter: { asset_serial_number: asset.asset_serial_number },
            update: {
              $setOnInsert: {
                ...asset,
                meta_data: {
                  created_at: new Date(),
                  created_by: "purchased",
                },
              },
            },
            upsert: true, 
          },
        }
      });
        
      await this.factoryPdtCacheModel.bulkWrite(bulkOps);
      return purchasedPdtData;
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
