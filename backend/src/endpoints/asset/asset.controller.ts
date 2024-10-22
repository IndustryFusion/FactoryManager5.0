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

import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Req, Res, Session, Query } from '@nestjs/common';
import { AssetService } from './asset.service';
import { TokenService } from '../session/token.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
import { Request } from 'express';
@Controller('asset')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService,
    private readonly allocatedAssetService: AllocatedAssetService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  async getAssetData(@Query('type') type: string) {
    try {
      const token = await this.tokenService.getToken();
      if (type) {
        return this.assetService.getAssetByType(type, token);
      } else {
        return await this.assetService.getAssetData(token);
      }
    } catch (err) {
      throw new NotFoundException("Error fetching assets " + err);
    }
  }

  @Get('/asset-management/:company_ifric_id')
  async getAssetManagementData(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    try {
      console.log("inside get asset ",company_ifric_id)
      const token = await this.tokenService.getToken();
      return this.assetService.getAssetManagementData(company_ifric_id, token, req);
    } catch (err) {
      throw new NotFoundException("Error fetching assets " + err);
    }
  }

  @Get('/type/:type')
  async getAssetByType(@Param('type') type: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.getAssetByType(atob(type), token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get('/parent-ids')
  async getParentIds(@Query('asset-id') assetId: string, @Query('asset-category') assetCategory: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.getParentIds(assetId, assetCategory, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Post('/get-owner-asset/:company_ifric_id')
  async setFactoryOwnerAssets(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.setFactoryOwnerAssets(company_ifric_id, token, req);
    } catch(err) {
      throw new NotFoundException();
    }
  }

  @Get('get-asset-by-id/:id')
  async getAssetDataById(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.getAssetDataById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id/keyvalues')
  async getkeyValuesById(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.getkeyValuesById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Post()
  async setAssetData( @Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.assetService.setAssetData(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
    } catch (err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }

  @Patch('/update-relation')
  async updateRelations(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.assetService.updateRelations(data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: response['message']
        }
      }
    } catch (err) {
      return { 
        success: false,
        status: err.response.status,
        message: "Error while updating asset relationships"
      };
    }
  }

  @Patch(':id')
  async updateAssetById(@Param('id') id: string, @Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.assetService.updateAssetById(id, data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
    } catch (err) {
      return {
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }

  @Delete('/delete-asset/:id')
  async deleteAssetRelation(@Param('id') id: string){
    try {
      const token = await this.tokenService.getToken();
      const response = await this.assetService.deleteAssetRelation(id, token, this.reactFlowService, this.allocatedAssetService);
      if(response['status'] == 200 || response['status'] == 204 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: 'Deleted Successfully',
        }
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
  async deleteAssetById(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.assetService.deleteAssetById(id, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Deleted Successfully',
        }
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