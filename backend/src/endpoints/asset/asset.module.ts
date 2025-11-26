import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetService } from './asset.service';
import { FactoryPdtCacheModule } from '../factory-pdt-cache/factory-pdt-cache.module';

@Module({
  imports: [
    FactoryPdtCacheModule,
  ],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}