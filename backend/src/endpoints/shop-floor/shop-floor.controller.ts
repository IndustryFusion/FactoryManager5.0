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
          const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/ld+json',
            Accept: 'application/ld+json',
          };
          const data = await this.factorySiteService.findOne(factoryId, token);
          
          let shopFloorData = data["http://www.industry-fusion.org/schema#hasShopFloor"];
          let obj = {
            type: 'Relationship',
            object: response.id
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
          const deleteResponse = await this.factorySiteService.remove(factoryId, token);
          if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
            const response = await axios.post(this.scorpioUrl, data, { headers });
            console.log('response ',response['status']);
            if(response['status'] == 200 || response['status'] == 201) {
              return {
                success: true,
                status: response['status'],
                message: 'shop-floor created and added in factory-site successfully',
                id: response['id']
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
      // const token = await getSessionToken(req);
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJQR1ItRmpRRVNfa1plMk5UQXFHd0N1dnRTY2hxUmlDZUlxZTkxZlRJSnBvIn0.eyJleHAiOjE3MzgwNjM0ODIsImlhdCI6MTcwNjUyNzQ4MiwianRpIjoiYWZlMTY3MzAtMzUxMS00ZGE2LWIyOWMtODU5MWQ1ZjU5ZDFhIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wbWVudC5pbmR1c3RyeS1mdXNpb24uY29tL2F1dGgvcmVhbG1zL2lmZiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjMWViNzg2My0zZWJlLTQ5NGUtYmJhOS01ZTY3YjZiYzI4MTciLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzY29ycGlvIiwic2Vzc2lvbl9zdGF0ZSI6IjIyMWYxOTBhLTE0YjAtNDY3Mi1iYzMwLTEyMTA0MWZiNTFmYSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlmZiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJzY29ycGlvIjp7InJvbGVzIjpbIkZhY3RvcnktQWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicGdyZXN0X3JvbGUgZW1haWwgZmFjdG9yeS1hZG1pbiBvZmZsaW5lX2FjY2VzcyBwcm9maWxlIiwic2lkIjoiMjIxZjE5MGEtMTRiMC00NjcyLWJjMzAtMTIxMDQxZmI1MWZhIiwicm9sZSI6InRzZGJfcmVhZGVyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJmYWN0b3J5IGFkbWluIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZmFjdG9yeV9hZG1pbiIsImdpdmVuX25hbWUiOiJmYWN0b3J5IiwiZmFtaWx5X25hbWUiOiJhZG1pbiIsImVtYWlsIjoiZmFjdG9yeV9hZG1pbkBpbmR1c3RyeS1mdXNpb24uY29tIn0.gpmhXfc_AT8xwAi9UfW0IQcEswf1JdSPahWjoccNx4858ptcXaajjd2vK4sJ4_hczo5JMxTnbP62p1r0ov8HaOby3bgKfOFUuN8vaC1Fm21C_Cbc_VvssyVJeOdtAcDX0ziB_CAUpMLjg2s7TcThNWJTjYh_NJhZHMj2yXkba-0oLjYrhwWWKRWsct_gCAKRjpOZpSl9xmD7S1HJ_5iMQL4w0vJ1eQ4nz8mTK9LVT0qDwOcuNdXlk8FU1t0xFAHp-pOcbykeXOW1OMOLzA3E82wuSc_OUtqEwuVoV4AE0uzF-freUZIQa2XqF-swkOr92_zPd0h0IB-voK-uZONScw"
      const response = await this.shopFloorService.updateReact(data, token);
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

  @Delete('/delete-react/:id')
  async deleteReact(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.shopFloorService.deleteScript(id, token);
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
            const deleteResponse = await this.factorySiteService.remove(factoryId, token);
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