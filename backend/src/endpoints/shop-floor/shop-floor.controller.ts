import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req, Query } from '@nestjs/common';
import { ShopFloorService } from './shop-floor.service';
import { Request, Response } from 'express';
import * as jsonData from './shop-floor-schema.json';
import { getSessionToken } from '../session/session.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import axios from 'axios';

@Controller('shop-floor')
export class ShopFloorController {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(private readonly shopFloorService: ShopFloorService, private readonly factorySiteService: FactorySiteService) {}

  @Post()
  async create(@Query('factory-id') factoryId: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.create(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        try{
          const data = await this.factorySiteService.findOne(factoryId, token);
          let shopFloorData = data["http://www.industry-fusion.org/schema#hasShopFloor"].object;
          
          if(Array.isArray(shopFloorData) && shopFloorData.length > 0)
            shopFloorData = [...shopFloorData, `${response.id}`];
          else if(shopFloorData.includes('urn'))
            shopFloorData = [shopFloorData, `${response.id}`];
          else 
          shopFloorData = [`${response.id}`];

          const finalData = {
            "http://www.industry-fusion.org/schema#hasShopFloor": {
              type: "Relationship",
              object: shopFloorData
            }
          };
          const updateResponse = await this.factorySiteService.update(factoryId, finalData, token);
          if(updateResponse['status'] == 200 || updateResponse['status'] == 204) {
            return {
              success: true,
              status: response['status'],
              message: 'shop-floor created and added in factory-site successfully',
              id: response['id']
            }
          } 
        }
        catch(err){
          return { 
            success: false, 
            status: err.response.status,
            message: err.response.data 
          };
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

  @Get('/template')
  async findshopFloorTemplate() {
    return jsonData;
  }

  @Get()
  async findAll(@Query('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.shopFloorService.findAll(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.shopFloorService.findOne(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch('/update-asset')
  async updateAssets(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.updateAssets(data, token);
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.update(id, data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: 'Updated Successfully',
        }
      }
    } catch (err) {
      console.log('err ',err);
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('factory-id') factoryId: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.remove(id, token);
      if(response['status'] == 200 || response['status'] == 204) {
        const data = await this.factorySiteService.findOne(factoryId, token);
        if(data) {
          let shopFloorData = data["http://www.industry-fusion.org/schema#hasShopFloor"];
          const updatedShopFloor = shopFloorData.object.filter(item => item !== id); 
          shopFloorData.object = updatedShopFloor;
          const finalData = {
            "http://www.industry-fusion.org/schema#hasShopFloor": shopFloorData
          };
          const response = await this.factorySiteService.update(factoryId, finalData, token);
          if(response['status'] == 200 || response['status'] == 204) {
            return {
              success: true,
              status: response['status'],
              message: 'Deleted shop-floor and Updated factory site successfully',
            }
          }
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
