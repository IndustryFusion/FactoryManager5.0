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

import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req } from '@nestjs/common';
import { FactorySiteService } from './factory-site.service';
import * as jsonData from './factory-schema.json';
import { getSessionToken } from '../session/session.service';
import { Request, Response } from 'express';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';

@Controller('factory-site')
export class FactorySiteController {
  constructor(
    private readonly factorySiteService: FactorySiteService,
    private readonly shopFloorService: ShopFloorService,
    private readonly allocatedAssetService: AllocatedAssetService
    ) {}

  @Post()
  async create(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.create(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText'],
          id: response['id']
        }
      } else {
        return response;
      }
    } catch (err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }

  @Get('/template')
  async findFactoryTemplate() {
    return jsonData;
  }

  @Get()
  async findAll(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.factorySiteService.findAll(token);
    } catch (err) {
      throw new NotFoundException("Failed in factory-site/get"+err);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.factorySiteService.findOne(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.update(id, data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      } else {
        return response;
      }
    } catch (err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.remove(id, token, this.shopFloorService);
      if(response['acknowledged']) {
        // Delete factory specific allocated assets
        let allocatedAssetId = `${id}:allocated-assets`;
        let deleteAllocatedAssetsResponse = await this.allocatedAssetService.remove(allocatedAssetId, token);
        // Update Global Allocated Assets
        await this.allocatedAssetService.updateGlobal(token);
        return {
          success: true,
          status: deleteAllocatedAssetsResponse['status'],
          message: 'Deleted Successfully',
        }
      } else {
        return response;
      }
    } catch (err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }
}
