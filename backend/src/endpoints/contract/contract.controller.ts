import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { TokenService } from '../session/token.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('contract')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly tokenService: TokenService
  ) {}

  @Get('get-contract-by-type/:contract_type')
  findByType(@Param('contract_type') contract_type: string) {
    return this.contractService.findByType(contract_type);
  }

  @UseGuards(AuthGuard)
  @Get('get-all-contract-by-asset-type/:company_ifric_id')
  async findAllContractByAssetTypes(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    const token = await this.tokenService.getToken();
    return this.contractService.findAllContractByAssetTypes(company_ifric_id, token, req);
  }
}
