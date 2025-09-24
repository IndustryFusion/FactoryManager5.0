import { Module } from '@nestjs/common';
import { FactoryPdtCacheService } from './factory-pdt-cache.service';
import { FactoryPdtCacheController } from './factory-pdt-cache.controller';

@Module({
  controllers: [FactoryPdtCacheController],
  providers: [FactoryPdtCacheService],
})
export class FactoryPdtCacheModule {}
