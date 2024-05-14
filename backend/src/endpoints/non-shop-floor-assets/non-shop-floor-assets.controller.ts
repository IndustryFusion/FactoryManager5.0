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

import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { NonShopFloorAssetsService } from './non-shop-floor-assets.service';
import { getSessionToken } from '../session/session.service';
import { Request, Response } from 'express';

@Controller('non-shop-floor-assets')
export class NonShopFloorAssetsController {
  constructor(private readonly nonShopFloorAssetsService: NonShopFloorAssetsService) {}

  @Get(':id')
  async findAll(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.nonShopFloorAssetsService.findAll(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
