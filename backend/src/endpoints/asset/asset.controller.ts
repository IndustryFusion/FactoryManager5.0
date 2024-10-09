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

  @Get('/type/:type')
  async getAssetByType(@Param('type') type: string) {
    try {
      // const token = await this.tokenService.getToken();
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxRWo5LXo2WTYyMDlJMWtuclJBX2U0MFdXVUhSWlk1Ul9VV01yTXBYOWVFIn0.eyJleHAiOjE3NTk5MzY4NzcsImlhdCI6MTcyODQwMDg3NywianRpIjoiOTk3NTliMWMtZWY0MC00MWFiLThjZTUtNjgxZjQwYjRkMWQxIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wbWVudC5pbmR1c3RyeS1mdXNpb24uY29tL2F1dGgvcmVhbG1zL2lmZiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJmNGU2NzQ3Ni1kMGJiLTQ3YWYtOWJkYi03ZDg1ZjYyYTMzYmYiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzY29ycGlvIiwic2Vzc2lvbl9zdGF0ZSI6IjUxODU2Y2E3LTVjYjQtNGE4My04ZjNjLWFiNjhjZmZhMWZjNiIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlmZiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJzY29ycGlvIjp7InJvbGVzIjpbIkZhY3RvcnktQWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicGdyZXN0X3JvbGUgZmFjdG9yeS1hZG1pbiBlbWFpbCBvZmZsaW5lX2FjY2VzcyBwcm9maWxlIiwic2lkIjoiNTE4NTZjYTctNWNiNC00YTgzLThmM2MtYWI2OGNmZmExZmM2Iiwicm9sZSI6ImRicmVhZGVyIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoiZmFjdG9yeSBhZG1pbiIsInByZWZlcnJlZF91c2VybmFtZSI6ImZhY3RvcnlfYWRtaW4iLCJnaXZlbl9uYW1lIjoiZmFjdG9yeSIsImZhbWlseV9uYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImZhY3RvcnlfYWRtaW5AaW5kdXN0cnktZnVzaW9uLmNvbSJ9.T7GJyHP7j4InrKbdu_6tJqe-SOvJz_fw_Z6-9awXoozo-fRCVzoeC3ZTlxCHxXnb6WYbYsvU1O3MaO29EQchqRzq-lh5CK617SEKEOgthgbM6Q15_YMr4Bbl5oBFarU5BHkclDL4u_YzlVBjBtUmPqkmDqOWIxkJ13pHL8Za3CVpaePBk1Yj1VmqkZ4fUyf9j_s17ROnSJORBA1ECyHcVW-gffCObahw6Is1kfTtj9aUXxtpaaoDGIDDt5FtdHNaO0HTNN7edH2qQLY9f4lvxY4UZQYhJUi_rLzQEPV6YrJck-BsstglTx3gA877TxukR38N1exQQeONkuE1nv65sQ";
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

  @Get('/get-owner-asset/:id')
  async getOwnerAssets(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.assetService.getOwnerAssets(id, token);
    } catch(err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
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