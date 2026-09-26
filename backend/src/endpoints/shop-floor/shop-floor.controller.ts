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

import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ShopFloorService } from './shop-floor.service';
import * as jsonData from './shop-floor-schema.json';
import { TokenService } from '../session/token.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';

import { upstreamMessage } from '../../utils/upstream-error';
import { linkTargets, replaceEntity, toLinks } from '../../utils/ngsi-ld';
@Controller('shop-floor')
export class ShopFloorController {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(
    private readonly shopFloorService: ShopFloorService, 
    private readonly factorySiteService: FactorySiteService,
    private readonly allocatedAssetService: AllocatedAssetService,
    private readonly tokenService: TokenService
    ) {}

  @Post()
  async create(@Query('factory-id') factoryId: string, @Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const createResponse = await this.shopFloorService.create(data, token);
      if(createResponse['status'] == 200 || createResponse['status'] == 201) {
        try{
          const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            Accept: 'application/ld+json',
          };
          const data = await this.factorySiteService.findOne(factoryId, token);
          
          const hasShopFloorKey = "http://www.industry-fusion.org/schema#hasShopFloor";
          data[hasShopFloorKey] = toLinks([...linkTargets(data[hasShopFloorKey]), createResponse.id]);
          // One replace instead of delete-then-create of the factory site.
          await replaceEntity(this.scorpioUrl, data, headers);
          return {
            // The status of what was asked for — the shop floor, created.
            // It used to be the status of the factory-site write that
            // follows, and Scorpio answers an upsert that *updates* with 204,
            // so a successful create reported 204 and the screen, which shows
            // its confirmation on 201, did nothing at all.
            success: true,
            status: createResponse['status'],
            message: 'shop-floor created and added in factory-site successfully',
            id: createResponse['id'],
            floorName: createResponse['floorName']
          }
        }
        catch(err){
          if(err instanceof HttpException) {
            throw err;
          } else if (err.response) {
            throw new HttpException({
              errorCode: `FS_${err.response.status}`,
              message: upstreamMessage(err)
            }, err.response.status);
          } else {
            throw new HttpException({
              errorCode: "FS_500",
              message: err.message
            }, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }
      } else{
        return createResponse;
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }

  @Get('/template')
  async findshopFloorTemplate() {
    return jsonData;
  }

  @Get()
  async findAll(@Query('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.shopFloorService.findAll(id, token);
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const token = await this.tokenService.getToken();
      return await this.shopFloorService.findOne(id, token);
    } catch (err) {
      throw err;
    }
  }

  @Patch('/update-react')
  async updateReact(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.shopFloorService.updateReact(data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        let updateGlobalResponse = await this.allocatedAssetService.updateGlobal(token);
        if(updateGlobalResponse['status'] == 200 || updateGlobalResponse['status'] == 204) {
          return {
            success: true,
            status: response['status'],
            message: 'Updated Successfully',
          }
       }
      } else {
        return response;
      }
    } catch (err) {
      throw err;
    }
  }

  @Patch('/update-asset')
  async updateAssets(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.shopFloorService.updateAssets(data, token);
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
      throw err;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.shopFloorService.update(id, data, token);
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
      throw err;
    }
  }
  
  @Delete('/delete-react')
  async deleteReact(@Body() data) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.shopFloorService.deleteScript(data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: response['message'],
        }
      }
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('factory-id') factoryId: string) {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.shopFloorService.remove(id, token);
      if(response['status'] == 200 || response['status'] == 204) {
        try {
          const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            Accept: 'application/ld+json',
          };
          const data = await this.factorySiteService.findOne(factoryId, token);
          if(data) {
            const hasShopFloorKey = "http://www.industry-fusion.org/schema#hasShopFloor";
            const links = toLinks(linkTargets(data[hasShopFloorKey]).filter((target) => target !== id));
            if (links) data[hasShopFloorKey] = links;
            else delete data[hasShopFloorKey];
            // One replace instead of delete-then-create of the factory site.
            const response = await replaceEntity(this.scorpioUrl, data, headers);
            return {
              success: true,
              status: response['status'],
              message: 'Deleted shop-floor and Updated factory site successfully',
              id: data.id
            }
          }
        } catch(err) {
          if(err instanceof HttpException) {
            throw err;
          } else if (err.response) {
            throw new HttpException({
              errorCode: `FS_${err.response.status}`,
              message: upstreamMessage(err)
            }, err.response.status);
          } else {
            throw new HttpException({
              errorCode: "FS_500",
              message: err.message
            }, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException(upstreamMessage(err), err.response.status);
      } else {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
    }
  }
}