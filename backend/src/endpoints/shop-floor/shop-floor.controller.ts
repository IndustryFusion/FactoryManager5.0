import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req, Query } from '@nestjs/common';
import { ShopFloorService } from './shop-floor.service';
import { Request, Response } from 'express';
import * as jsonData from './shop-floor-schema.json';
import { getSessionToken } from '../session/session.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { AllocatedAssetService } from '../allocated-asset/allocated-asset.service';
import axios from 'axios';

@Controller('shop-floor')
export class ShopFloorController {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(
    private readonly shopFloorService: ShopFloorService, 
    private readonly factorySiteService: FactorySiteService,
    private readonly allocatedAssetService: AllocatedAssetService
    ) {}

  @Post()
  async create(@Query('factory-id') factoryId: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const createResponse = await this.shopFloorService.create(data, token);
      if(createResponse['status'] == 200 || createResponse['status'] == 201) {
        try{
          const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            Accept: 'application/ld+json',
          };
          const data = await this.factorySiteService.findOne(factoryId, token);
          
          let shopFloorData = data["http://www.industry-fusion.org/schema#hasShopFloor"];
          let obj = {
            type: 'Relationship',
            object: createResponse.id
          }
          if(Array.isArray(shopFloorData) && shopFloorData.length > 0) {
            shopFloorData = [...shopFloorData, obj];
          } else if(shopFloorData.object.includes('urn')) {
            shopFloorData = [shopFloorData, obj]
          } else {
            shopFloorData = [obj];
          }
          
          console.log('after shopfloor data ',shopFloorData)
          data["http://www.industry-fusion.org/schema#hasShopFloor"] = shopFloorData
          const deleteResponse = await this.factorySiteService.removeScript(factoryId, token);
          if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
            const response = await axios.post(this.scorpioUrl, data, { headers });
            console.log('response ',response['status']);
            if(response['status'] == 200 || response['status'] == 201) {
              return {
                success: true,
                status: response['status'],
                message: 'shop-floor created and added in factory-site successfully',
                id: createResponse['id'],
                floorName: createResponse['floorName']
              }
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
      } else{
        return createResponse;
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

  @Patch('/update-react')
  async updateReact(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
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
      } else {
        return response;
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
      } else {
        return response;
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
  
  @Delete('/delete-react')
  async deleteReact(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.deleteScript(data, token);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: response['message'],
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
  async remove(@Param('id') id: string, @Query('factory-id') factoryId: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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
            let shopFloorData = data["http://www.industry-fusion.org/schema#hasShopFloor"];
            console.log('shopFloorData ',shopFloorData);
            console.log('id to be deleted ',id);
            if(Array.isArray(shopFloorData) && shopFloorData.length > 0) {
              shopFloorData = shopFloorData.filter(item => item.object !== id); 
            } else if(shopFloorData.object == id) {
              shopFloorData.object = "";
            }
            console.log('after shopfloor data ',shopFloorData)
            data["http://www.industry-fusion.org/schema#hasShopFloor"] = shopFloorData
            const deleteResponse = await this.factorySiteService.removeScript(factoryId, token);
            if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
              const response = await axios.post(this.scorpioUrl, data, { headers });
              console.log('response ',response['status']);
              if(response['status'] == 200 || response['status'] == 201) {
                return {
                  success: true,
                  status: response['status'],
                  message: 'Deleted shop-floor and Updated factory site successfully',
                  id: response['id']
                }
              } 
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
    } catch (err) {
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      };
    }
  }
}