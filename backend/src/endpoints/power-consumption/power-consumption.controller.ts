import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PowerConsumptionService } from './power-consumption.service';
import { getSessionToken } from '../session/session.service';

@Controller('power-consumption')
export class PowerConsumptionController {
  constructor(private readonly powerConsumptionService: PowerConsumptionService) {}

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
  async findChartData(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.powerConsumptionService.findChartData(token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }
}
