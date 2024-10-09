import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';

@Module({
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
