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
import { Request, Response } from 'express';
import { TemplateDescriptionDto } from '../templates/dto/templateDescription.dto';
import { getSessionToken } from '../session/session.service';
import { ReactFlowService } from '../react-flow/react-flow.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
@Controller('asset')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly reactFlowService: ReactFlowService,
    private readonly allocatedAssetService: AllocatedAssetService,
  ) {}

  @Get()
  async getAssetData(@Req() req: Request, @Query('type') type: string) {
    try {
      const token = await getSessionToken(req);
      if (type) {
        return this.getAssetByType(type, token);
      } else {
        return await this.assetService.getAssetData(token);
      }
    } catch (err) {
      throw new NotFoundException("Error fetching assets " + err);
    }
  }

  @Get('type=:type')
  async getAssetByType(type: string, token: string) {
    try {
      return await this.assetService.getAssetByType(type, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get('/parent-ids')
  async getParentIds(@Query('asset-id') assetId: string, @Query('asset-category') assetCategory: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.assetService.getParentIds(assetId, assetCategory, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async getAssetDataById(@Param('id') id: string, @Req() req: Request) {
    try {
      // const token = await getSessionToken(req);
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJGSHYxQ1AtRU9ILTQwd0dROTQydXpyVUV0STZlMV9xUzZySUdJQ3phRVF3In0.eyJleHAiOjE3NDUzMDEyMDAsImlhdCI6MTcxMzc2NTIwMCwianRpIjoiMzMxZDgxZmYtNzUyNC00ZDc0LTk3MTYtMjY2ODlmZTQ5NTAyIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wbWVudC5pbmR1c3RyeS1mdXNpb24uY29tL2F1dGgvcmVhbG1zL2lmZiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJkNTNlMWVlYy02OGM4LTRkY2EtOGUzNS1hMWIyYzZlNzY2ZDQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzY29ycGlvIiwic2Vzc2lvbl9zdGF0ZSI6IjJjMDlkMDA3LTA3ZWItNDljZi1iMTU5LTgyZDhkYTkzOTU0MyIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlmZiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJzY29ycGlvIjp7InJvbGVzIjpbIkZhY3RvcnktQWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicGdyZXN0X3JvbGUgZW1haWwgcHJvZmlsZSBmYWN0b3J5LWFkbWluIG9mZmxpbmVfYWNjZXNzIiwic2lkIjoiMmMwOWQwMDctMDdlYi00OWNmLWIxNTktODJkOGRhOTM5NTQzIiwicm9sZSI6InRzZGJfcmVhZGVyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJmYWN0b3J5IGFkbWluIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZmFjdG9yeV9hZG1pbiIsImdpdmVuX25hbWUiOiJmYWN0b3J5IiwiZmFtaWx5X25hbWUiOiJhZG1pbiIsImVtYWlsIjoiZmFjdG9yeV9hZG1pbkBpbmR1c3RyeS1mdXNpb24uY29tIn0.lVNXjQPZ2Akh4f1vbilXA_4sfTB5ZPt6_NQNSYfi6jRyPDdEBPn4ksmqpbb27RSmI4Sq6b8WJzeSrt0wTQ8YiWu5OS7LduTdEd-lyxEDq6aerm7Ges6SvXN669irObrRA-4s_8X_90kj04TKOoxyd1lFptqXHDxFY5wmu6LcsOy_ICjM15ouR16h3_DMYipzVCcQBdV2oyQGapbT2E6hE506wg9fy7dY1LoyPF_Lfb2eOt6q9t-YIjEd1JRjQ6sB1dr_vQCOOgXZlZLaIljpIcOexEm0khysk71tGzaH2CYq_XOkU20Yy2AkHi9AetEDK3owhY0gXlZTLQGWWwb_ZA';
      return await this.assetService.getAssetDataById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id/keyvalues')
  async getkeyValuesById(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.assetService.getkeyValuesById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Post()
  async setAssetData( @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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
  async updateRelations(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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
  async updateAssetById(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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
  async deleteAssetRelation(@Param('id') id: string, @Req() req: Request){
    try {
      const token = await getSessionToken(req);
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
  async deleteAssetById(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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