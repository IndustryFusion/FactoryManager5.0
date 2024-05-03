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
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJGSHYxQ1AtRU9ILTQwd0dROTQydXpyVUV0STZlMV9xUzZySUdJQ3phRVF3In0.eyJleHAiOjE3NDUzMDEyMDAsImlhdCI6MTcxMzc2NTIwMCwianRpIjoiMzMxZDgxZmYtNzUyNC00ZDc0LTk3MTYtMjY2ODlmZTQ5NTAyIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wbWVudC5pbmR1c3RyeS1mdXNpb24uY29tL2F1dGgvcmVhbG1zL2lmZiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJkNTNlMWVlYy02OGM4LTRkY2EtOGUzNS1hMWIyYzZlNzY2ZDQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzY29ycGlvIiwic2Vzc2lvbl9zdGF0ZSI6IjJjMDlkMDA3LTA3ZWItNDljZi1iMTU5LTgyZDhkYTkzOTU0MyIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlmZiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJzY29ycGlvIjp7InJvbGVzIjpbIkZhY3RvcnktQWRtaW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicGdyZXN0X3JvbGUgZW1haWwgcHJvZmlsZSBmYWN0b3J5LWFkbWluIG9mZmxpbmVfYWNjZXNzIiwic2lkIjoiMmMwOWQwMDctMDdlYi00OWNmLWIxNTktODJkOGRhOTM5NTQzIiwicm9sZSI6InRzZGJfcmVhZGVyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJmYWN0b3J5IGFkbWluIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZmFjdG9yeV9hZG1pbiIsImdpdmVuX25hbWUiOiJmYWN0b3J5IiwiZmFtaWx5X25hbWUiOiJhZG1pbiIsImVtYWlsIjoiZmFjdG9yeV9hZG1pbkBpbmR1c3RyeS1mdXNpb24uY29tIn0.lVNXjQPZ2Akh4f1vbilXA_4sfTB5ZPt6_NQNSYfi6jRyPDdEBPn4ksmqpbb27RSmI4Sq6b8WJzeSrt0wTQ8YiWu5OS7LduTdEd-lyxEDq6aerm7Ges6SvXN669irObrRA-4s_8X_90kj04TKOoxyd1lFptqXHDxFY5wmu6LcsOy_ICjM15ouR16h3_DMYipzVCcQBdV2oyQGapbT2E6hE506wg9fy7dY1LoyPF_Lfb2eOt6q9t-YIjEd1JRjQ6sB1dr_vQCOOgXZlZLaIljpIcOexEm0khysk71tGzaH2CYq_XOkU20Yy2AkHi9AetEDK3owhY0gXlZTLQGWWwb_ZA';
      // const token = await getSessionToken(req);
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