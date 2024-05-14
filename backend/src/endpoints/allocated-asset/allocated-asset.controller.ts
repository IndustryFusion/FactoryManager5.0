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
import { Request, Response } from 'express';
import { AllocatedAssetService } from './allocated-asset.service';
import { getSessionToken } from '../session/session.service';

@Controller('allocated-asset')
export class AllocatedAssetController {
  constructor(private readonly allocatedAssetService: AllocatedAssetService) {}

  @Post('/global')
  async createGlobal(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.createGlobal(token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      }
    }
  }

  @Post('/form')
  async updateFormAllocatedAsset(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.updateFormAllocatedAsset(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      }
    }
  }

  @Post()
  async create(@Query('factory-id') factoryId: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.create(factoryId, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      }
    }
  } 

  @Get('/product-names')
  async findProductName(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.allocatedAssetService.findProductName(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
  
  @Get()
  async findAll(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.allocatedAssetService.findAll(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.allocatedAssetService.findOne(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch('/global')
  async updateGlobal(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.updateGlobal(token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
    
  }

  @Patch()
  async update(@Query('factory-id') factoryId: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.update(factoryId, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
    
  }

  @Delete()
  async remove(@Query('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.remove(id, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Deleted Successfully',
        }
      }
    } catch(err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }
}