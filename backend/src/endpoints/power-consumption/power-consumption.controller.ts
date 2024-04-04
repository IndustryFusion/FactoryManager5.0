import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { PowerConsumptionService } from './power-consumption.service';
import { getSessionToken } from '../session/session.service';
import { RedisService } from '../redis/redis.service';

@Controller('power-consumption')
export class PowerConsumptionController {
  constructor(private readonly powerConsumptionService: PowerConsumptionService, 
    private readonly redisService: RedisService) {}

  @Get()
  async findComsumtionPerDay(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      
      let response = this.powerConsumptionService.findComsumtionPerDay(token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }

  @Get('/chart')
  async findChartData(@Query('asset-id') assetId: string, @Query('type') type: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
       const headers = { Authorization: 'Bearer ' + token };
      const redisKey = `chartData:${assetId}:${type}`;
      let cachedData = await this.redisService.getData(redisKey);

      if (cachedData) {
        console.log('Returning cached chart data for', assetId, type);
        return cachedData;
      }

      // Fetch new chart data since it's not cached...
      const labels = [], powerConsumption = [], emission = [];

      // Your existing logic to populate labels, powerConsumption, and emission...

      let chartData = { labels, powerConsumption, emission };

      let response = await this.powerConsumptionService.findChartData(assetId, type, token);
      chartData = response;

        await this.redisService.saveData(redisKey, chartData);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }
}
