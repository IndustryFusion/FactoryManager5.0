import { Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';
import axios from 'axios';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCache: Model<FactoryPdtCache>
  ){}

  private readonly ifxPlatformUrl = process.env.IFX_PLATFORM_BACKEND_URL;

  async getSyncPdtData(company_ifric_id: string) {
    try {
      const response = await axios.get(`${this.ifxPlatformUrl}/company/get-sync-pdt-data/${company_ifric_id}`);
      const factoryPdtData = await this.factoryPdtCache.find({company_ifric_id, isScorpioUpadted: true, isCacheUpdated: true});
      const result = [...response.data, ...factoryPdtData].reduce((acc, obj) => {
        acc[`${obj.product_name}_${obj.asset_serial_number}`] = obj;
        return acc;
      }, {} as Record<string, any>);

      // return array of asset_serial_number strings
      return Object.keys(result);
    } catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(err.response.data.title || err.response.data.message, err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
}
