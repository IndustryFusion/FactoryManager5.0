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

import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException, UseGuards } from '@nestjs/common';
import { NonShopFloorAssetsService } from './non-shop-floor-assets.service';
import { TokenService } from '../session/token.service';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';

@Controller('non-shop-floor-assets')
export class NonShopFloorAssetsController {
  constructor(
    private readonly nonShopFloorAssetsService: NonShopFloorAssetsService,
    private readonly tokenService: TokenService
  ) {}

  @UseGuards(AuthGuard)
  @Get(':company_ifric_id/:id')
  async findAll( @Param('company_ifric_id') company_ifric_id: string,  @Param('id') id: string, @Req() req: Request ) {
    try {
      const token = await this.tokenService.getToken();
      return this.nonShopFloorAssetsService.findAll(id, token,company_ifric_id,req);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
