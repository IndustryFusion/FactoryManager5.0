import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { PowerConsumptionService } from './power-consumption.service';
import { getSessionToken } from '../session/session.service';
import { RedisService } from '../redis/redis.service';

@Controller('power-consumption')
export class PowerConsumptionController {
  constructor(private readonly powerConsumptionService: PowerConsumptionService, 
    private readonly redisService: RedisService) {}

  @Get('/chart')
  async findChartData(@Query() queryParams: any, @Req() req: Request) {
    try {
      console.log('inside find chart data query ',queryParams);
      const token = await getSessionToken(req);
      let response = await this.powerConsumptionService.findChartData(queryParams, token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }

  @Get()
  async findOne(@Query() queryParams: any, @Req() req: Request){
    try {
      const token = await getSessionToken(req);
      let response = await this.powerConsumptionService.findOne(queryParams, token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }
}
