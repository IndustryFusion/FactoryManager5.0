import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetService } from './asset.service';
import { FactoryPdtCache, FactoryPdtCacheSchema } from '../schemas/factory-pdt-cache.schema';

@Module({
  imports: [
    // use 'factory' here *only if* AssetService injects with that connection name
    MongooseModule.forFeature(
      [{ name: FactoryPdtCache.name, schema: FactoryPdtCacheSchema }]
      // , 'factory'
    ),
  ],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}