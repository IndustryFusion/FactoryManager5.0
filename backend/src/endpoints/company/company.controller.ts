import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Req } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Response, Request } from 'express';
import { TokenService } from '../session/token.service';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly tokenService: TokenService
  ) {}

  @Get('get-sync-pdt-data/:company_ifric_id')
  getSyncPdtData(@Param('company_ifric_id') company_ifric_id: string) {
    return this.companyService.getSyncPdtData(company_ifric_id);
  }

  @Get('get-sync-pdt-count/:company_ifric_id')
  getSyncPdtCountData(@Param('company_ifric_id') company_ifric_id: string) {
    return this.companyService.getSyncPdtCountData(company_ifric_id);
  }

  @Post('sync-pdt/:company_ifric_id') 
  async syncPdt(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request, @Res() res: Response) {
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    const token = await this.tokenService.getToken();
    return this.companyService.syncPdt(company_ifric_id, token, req, res);
  }
}
