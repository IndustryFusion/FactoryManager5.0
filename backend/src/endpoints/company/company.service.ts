import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FactoryPdtCache } from '../schemas/factory-pdt-cache.schema';
import axios from 'axios';
import { Response, Request } from 'express';

import { upstreamMessage } from '../../utils/upstream-error';
import { assertCompliant, mergeForSync, templateCache, toNgsiLd } from '../../utils/ngsi-ld';
@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);
  constructor(
    @InjectModel(FactoryPdtCache.name)
    private readonly factoryPdtCache: Model<FactoryPdtCache>
  ){}

  private readonly ifxPlatformUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  private readonly context = process.env.CONTEXT;

  async getSyncPdtData(company_ifric_id: string) {
    try {
      const response = await axios.get(`${this.ifxPlatformUrl}/company/get-sync-pdt-data/${company_ifric_id}`);
      const factoryPdtData = await this.factoryPdtCache.find({company_ifric_id, isCacheUpdated: true});
      const result = [...response.data, ...factoryPdtData].reduce((acc, obj) => {
        acc[`${obj.product_name}_${obj.asset_serial_number}`] = obj;
        return acc;
      }, {} as Record<string, any>);

      // return array of asset_serial_number strings
      return Object.keys(result);
    } catch(err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || upstreamMessage(err).includes("network") || err.message.includes("network")) {
        return [];
      } else if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async getSyncPdtCountData(company_ifric_id: string) {
    try {
      const response = await axios.get(`${this.ifxPlatformUrl}/company/get-sync-pdt-count-data/${company_ifric_id}`);
      const factoryPdtData = await this.factoryPdtCache.find({company_ifric_id, isCacheUpdated: true});
      const result = [...response.data, ...factoryPdtData].reduce((acc, obj) => {
        acc[obj.id] = obj;
        return acc;
      }, {} as Record<string, any>);

      // return count of dinstinct assets
      return {
        success: true,
        status: 200,
        assetsWithUpdates: Object.keys(result).length
      }
    } catch(err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || upstreamMessage(err).includes("network") || err.message.includes("network")) {
        return {
          success: true,
          status: 200,
          assetsWithUpdates: 0
        };
      } else if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  async syncPdt(company_ifric_id: string, token: string, req: Request, res: Response) {
    let successCount = 0, failureCount = 0, logDetails = {};
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers['authorization']
      };

      const scorpioHeaders = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      }
      const ifxCacheData = await axios.get(`${this.ifxPlatformUrl}/company/get-sync-pdt-count-data/${company_ifric_id}`);
      const factoryPdtData = await this.factoryPdtCache.find({company_ifric_id, isCacheUpdated: true});
      const updateIfxData = [];
      for(let i = 0; i < factoryPdtData.length; i++) {
        updateIfxData.push({
          asset_ifric_id: factoryPdtData[i].id,
          factory_site: factoryPdtData[i].factory_site,
          shop_floor: factoryPdtData[i].shop_floor
        })
      }
      
      // endpoint to update all ifx cache data factory_site and shop_floor data
      await axios.patch(`${this.ifxPlatformUrl}/company/update-factory-and-shopfloor/${company_ifric_id}`,updateIfxData);

      // after ifx cache update set isCacheUpdated to false for factory pdt cache
      await this.factoryPdtCache.updateMany({company_ifric_id}, {isCacheUpdated : false});

      let total = ifxCacheData.data.length, processed = 0, updatedAssetIds = [];
      const templateFor = templateCache();
      const batchSize = 50;
      for(let i = 0; i < ifxCacheData.data.length; i += batchSize) {
        const batch = ifxCacheData.data.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (asset) => {
            try {
              if(!logDetails[asset.product_name]) {
                logDetails[asset.product_name] = {};
              }
              const [ifxResponse, factoryScorpioResponse] = await Promise.all([
                axios.get(`${this.ifxPlatformUrl}/asset/${asset.id}`, { headers }),
                axios.get(`${this.scorpioUrl}/${asset.id}`, {headers: scorpioHeaders})
              ])
              const ifxScorpioData = ifxResponse.data;
              const factoryScorpioData = factoryScorpioResponse.data;

              // Convert IFX's free-form product to compliant NGSI-LD, then merge:
              // IFX's attributes win, FactoryManager keeps its link targets and live values.
              const template = await templateFor(ifxScorpioData.type, company_ifric_id, asset.product_name);
              const { entity, dropped, warnings } = toNgsiLd(ifxScorpioData, template);
              warnings.forEach((warning) => this.logger.warn(`${asset.id}: ${warning}`));
              const { attrs, remove } = mergeForSync(entity, dropped, factoryScorpioData, template);
              assertCompliant(attrs, { requireId: false, label: `update for ${asset.id}` });

              // update factory scorpio
              const url = this.scorpioUrl + '/' + asset.id + '/attrs';
              await axios.post(url, { ...attrs, '@context': this.context }, { headers: scorpioHeaders });

              // IFX cleared these values: remove the stale FactoryManager copies.
              for (const key of remove) {
                await axios.delete(`${url}/${encodeURIComponent(key)}`, { headers: scorpioHeaders }).catch((err) => {
                  if (err.response?.status !== 404) throw err;
                });
              }

              // update factory cache
              delete asset.factory_site;
              delete asset.shop_floor;
              delete asset._id;

              await this.factoryPdtCache.updateOne({company_ifric_id, id: asset.id}, { $set: asset });

              // add assetId in updatedAssetIds after successful update
              updatedAssetIds.push(asset.id);
              successCount++;
              return { status: "success", message: `${asset.asset_serial_number} Product Synced Successfully.` };
            } catch (err) {
              failureCount++;
              logDetails[asset.product_name] ??= {};
              logDetails[asset.product_name][asset.asset_serial_number] =  (err.response?.errors ? `${err.response.message}: ${err.response.errors.slice(0, 5).join('; ')}` : undefined) || err.response?.message || err.response?.data?.title || err.response?.data?.message || "Product Sync Failed";
            } finally {
              processed++;
              res.write(
                JSON.stringify({ total, processed }) + "\n"
              );
            }
          })
        )
      }

      // Update isScorpioUpdated to false in ifx together at end
      await axios.patch(`${this.ifxPlatformUrl}/company/update-is-scorpio-updated/${company_ifric_id}`, updatedAssetIds, { headers });

      res.write(
        JSON.stringify({
          success: true,
          status: 201,
          data: {
            message: "Synced with Pdt successfully",
            successCount,
            failureCount,
            logDetails
          }
        }) + "\n"
      );

      res.end();
    } catch(err) {
      res.write(
        JSON.stringify({
          success: false,
          status: 500,
          data: { successCount, failureCount, logDetails }
        }) + "\n"
      );
      res.end();
      if (err instanceof HttpException) {
        throw err;
      } else if(err.response) {
        throw new HttpException(upstreamMessage(err, "Failed to sync pdt"), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
}
