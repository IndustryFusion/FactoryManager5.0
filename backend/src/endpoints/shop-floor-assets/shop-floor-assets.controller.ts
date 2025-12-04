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
import { ShopFloorAssetsService } from './shop-floor-assets.service';
import { TokenService } from '../session/token.service';

@Controller('shop-floor-assets')
export class ShopFloorAssetsController {
  constructor(
    private readonly shopFloorAssetsService: ShopFloorAssetsService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  async findAll(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return this.shopFloorAssetsService.findAll(id, token);
    } catch (err) {
      throw err;
    }
  }
}
