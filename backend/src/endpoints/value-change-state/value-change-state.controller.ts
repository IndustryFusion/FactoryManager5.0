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

import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ValueChangeStateService } from './value-change-state.service';
import { TokenService } from '../session/token.service';

@Controller('value-change-state')
export class ValueChangeStateController {
  constructor(
    private readonly valueChangeStateService: ValueChangeStateService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  async findOne(@Query() queryParams: any, @Req() req: Request) {
    try {
      const token = await this.tokenService.getToken();
      return await this.valueChangeStateService.findOne(queryParams, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get('/chart')
  async findAll(@Query('asset-id') assetId: string, @Query('type') type: string, @Req() req: Request) {
    try {
      const token = await this.tokenService.getToken();
      return await this.valueChangeStateService.findAll(assetId, type, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
