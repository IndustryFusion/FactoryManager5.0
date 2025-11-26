import { Module } from '@nestjs/common';
import { FactoryPdtCacheService } from './factory-pdt-cache.service';
import { FactoryPdtCacheController } from './factory-pdt-cache.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FactoryPdtCache, FactoryPdtCacheSchema } from '../schemas/factory-pdt-cache.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FactoryPdtCache.name, schema: FactoryPdtCacheSchema }
    ]),
  ],
  controllers: [FactoryPdtCacheController],
  providers: [FactoryPdtCacheService],
  exports: [
    FactoryPdtCacheService,
    MongooseModule   
  ],
})
export class FactoryPdtCacheModule {}
