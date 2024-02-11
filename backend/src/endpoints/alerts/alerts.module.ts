import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
