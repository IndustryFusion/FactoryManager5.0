import { Module } from '@nestjs/common';
import { PowerConsumptionService } from './power-consumption.service';
import { PowerConsumptionController } from './power-consumption.controller';

@Module({
  controllers: [PowerConsumptionController],
  providers: [PowerConsumptionService],
})
export class PowerConsumptionModule {}
