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

import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AllocatedAssetService } from './allocated-asset.service';
import { TokenService } from '../session/token.service';
import { toHttpException } from '../../utils/upstream-error';

@Controller('allocated-asset')
export class AllocatedAssetController {
  constructor(
    private readonly allocatedAssetService: AllocatedAssetService,
    private readonly tokenService: TokenService
  ) {}

  @Post('/global')
  async createGlobal() {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.createGlobal(token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
      throw new HttpException(
        `The allocated assets could not be written (upstream status ${response?.['status']}).`,
        HttpStatus.BAD_GATEWAY,
      );
    } catch(err) {
      throw toHttpException(err);
    }
  }

  @Post('/form')
  async updateFormAllocatedAsset(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.updateFormAllocatedAsset(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
      throw new HttpException(
        `The allocated assets could not be written (upstream status ${response?.['status']}).`,
        HttpStatus.BAD_GATEWAY,
      );
    } catch(err) {
      throw toHttpException(err);
    }
  }

  @Post()
  async create(@Query('factory-id') factoryId: string) {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.create(factoryId, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText']
        }
      }
      throw new HttpException(
        `The allocated assets could not be written (upstream status ${response?.['status']}).`,
        HttpStatus.BAD_GATEWAY,
      );
    } catch(err) {
      throw toHttpException(err);
    }
  } 

  @Get('/product-names')
  async findProductName() {
    try {
      const token = await this.tokenService.getToken();
      return this.allocatedAssetService.findProductName(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
  
  @Get()
  async findAll() {
    try {
      const token = await this.tokenService.getToken();
      return this.allocatedAssetService.findAll(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.allocatedAssetService.findOne(id, token);
    } catch (err) {
      // Every failure used to be answered as a bare "Not Found", so Scorpio
      // being unreachable, or a token being refused, read to the caller as an
      // empty factory. The service says what went wrong; pass it on.
      if (err instanceof HttpException) {
        throw err;
      }
      throw new NotFoundException();
    }
  }

  @Patch('/global')
  async updateGlobal() {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.updateGlobal(token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
      // No silent fall-through: an unexpected status is a failure, and the
      // caller has to be able to see it.
      throw new HttpException(
        `The allocated assets could not be updated (upstream status ${response?.['status']}).`,
        HttpStatus.BAD_GATEWAY,
      );
    } catch(err) {
      // Thrown, not returned: returning the failure left the HTTP status at
      // 200/201, so every caller read a failed write as a successful one. And
      // `err.response` is an axios shape — on the HttpException the service
      // actually throws it is the payload, so the status came out undefined.
      throw toHttpException(err);
    }
    
  }

  @Patch()
  async update(@Query('factory-id') factoryId: string, @Body() data) {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.update(factoryId, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
      // No silent fall-through: an unexpected status is a failure, and the
      // caller has to be able to see it.
      throw new HttpException(
        `The allocated assets could not be updated (upstream status ${response?.['status']}).`,
        HttpStatus.BAD_GATEWAY,
      );
    } catch(err) {
      // Thrown, not returned: returning the failure left the HTTP status at
      // 200/201, so every caller read a failed write as a successful one. And
      // `err.response` is an axios shape — on the HttpException the service
      // actually throws it is the payload, so the status came out undefined.
      throw toHttpException(err);
    }
    
  }

  @Delete()
  async remove(@Query('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      let response = await this.allocatedAssetService.remove(id, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Deleted Successfully',
        }
      }
    } catch(err) {
      // Thrown, not returned: returning the failure left the HTTP status at
      // 200/201, so every caller read a failed write as a successful one. And
      // `err.response` is an axios shape — on the HttpException the service
      // actually throws it is the payload, so the status came out undefined.
      throw toHttpException(err);
    }
  }
}