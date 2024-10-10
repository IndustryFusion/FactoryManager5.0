import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get('get-contract-by-type/:contract_type')
  findByType(@Param('contract_type') contract_type: string) {
    return this.contractService.findByType(contract_type);
  }
}
