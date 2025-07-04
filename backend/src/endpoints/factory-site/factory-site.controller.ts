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

import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req, UnauthorizedException } from '@nestjs/common';
import { FactorySiteService } from './factory-site.service';
import * as jsonData from './factory-schema.json';
import { TokenService } from '../session/token.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
import { String } from 'aws-sdk/clients/appstream';

@Controller('factory-site')
export class FactorySiteController {
  constructor(
    private readonly factorySiteService: FactorySiteService,
    private readonly shopFloorService: ShopFloorService,
    private readonly allocatedAssetService: AllocatedAssetService,
    private readonly tokenService: TokenService
    ) {}

  @Post()
  async create(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
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
  async findAll() {
    try {
      const token = await this.tokenService.getToken();
      return await this.factorySiteService.findAll(token);
    } catch (err) {
      if (err.response?.status === 401) {
        throw new UnauthorizedException('Repository unauthorized');
      }
      throw new err;
    }
  }

  @Get('/company-specific/:company_ifric_id')
  async companySpecificFactories(@Param('company_ifric_id') company_ifric_id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.factorySiteService.companySpecificFactories(company_ifric_id, token);
    } catch (err) {
      if (err.response?.status === 401) {
        throw new UnauthorizedException('Repository unauthorized');
      }
      throw new err;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.factorySiteService.findOne(id, token);
    } catch (err) {
      throw new err;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data) {
    try {
      const token = await this.tokenService.getToken();
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
  async remove(@Param('id') id: String) {
    try {
      const token = await this.tokenService.getToken();
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
