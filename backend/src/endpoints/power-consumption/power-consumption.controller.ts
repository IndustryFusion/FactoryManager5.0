// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException, Query } from '@nestjs/common';
import { PowerConsumptionService } from './power-consumption.service';
import { TokenService } from '../session/token.service';

@Controller('power-consumption')
export class PowerConsumptionController {
  constructor(
    private readonly powerConsumptionService: PowerConsumptionService, 
    private readonly tokenService: TokenService
  ) {}

  @Get('/chart')
  async findChartData(@Query() queryParams: any) {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.powerConsumptionService.findChartData(queryParams, token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }

  @Get()
  async findOne(@Query() queryParams: any){
    try {
      const token = await this.tokenService.getToken();
      let response = await this.powerConsumptionService.findOne(queryParams, token);
      return response;
    } catch(err) {
      throw new NotFoundException();
    }
  }
}
