import { Module } from '@nestjs/common';
import { AllocatedAssetService } from './allocated-asset.service';
import { AllocatedAssetController } from './allocated-asset.controller';

@Module({
  controllers: [AllocatedAssetController],
  providers: [AllocatedAssetService],
})
export class AllocatedAssetModule {}
