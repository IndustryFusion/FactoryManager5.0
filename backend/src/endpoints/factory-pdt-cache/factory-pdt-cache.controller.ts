import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FactoryPdtCacheService } from './factory-pdt-cache.service';
import { CreateFactoryPdtCacheDto, UpdateFactoryPdtCacheDto } from './dto/create-factory-pdt-cache.dto';

@Controller('factory-pdt-cache')
export class FactoryPdtCacheController {
  constructor(private readonly factoryPdtCacheService: FactoryPdtCacheService) {}

  @Post()
  create(@Body() createFactoryPdtCacheDto: CreateFactoryPdtCacheDto) {
    return this.factoryPdtCacheService.create(createFactoryPdtCacheDto);
  }

  @Get(":company_ifric_id")
  findAll(@Param('company_ifric_id') company_ifric_id: string) {
    return this.factoryPdtCacheService.findAll(company_ifric_id);
  }
}
