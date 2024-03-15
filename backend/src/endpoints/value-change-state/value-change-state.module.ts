import { Module } from '@nestjs/common';
import { ValueChangeStateService } from './value-change-state.service';
import { ValueChangeStateController } from './value-change-state.controller';

@Module({
  controllers: [ValueChangeStateController],
  providers: [ValueChangeStateService],
})
export class ValueChangeStateModule {}
