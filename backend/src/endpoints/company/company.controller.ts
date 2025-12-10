import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('get-sync-pdt-data/:company_ifric_id')
  getSyncPdtData(@Param('company_ifric_id') company_ifric_id: string) {
    return this.companyService.getSyncPdtData(company_ifric_id);
  }

  @Get('get-sync-pdt-count/:company_ifric_id')
  getSyncPdtCountData(@Param('company_ifric_id') company_ifric_id: string) {
    return this.companyService.getSyncPdtCountData(company_ifric_id);
  }
}
