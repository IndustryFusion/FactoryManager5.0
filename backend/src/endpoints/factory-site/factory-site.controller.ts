import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req } from '@nestjs/common';
import { FactorySiteService } from './factory-site.service';
import * as jsonData from './factory-schema.json';
import { getSessionToken } from '../session/session.service';
import { Request, Response } from 'express';

@Controller('factory-site')
export class FactorySiteController {
  constructor(private readonly factorySiteService: FactorySiteService) {}

  @Post()
  async create(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.create(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText'],
          id: response['id']
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
  async findFactoryTemplate() {
    return jsonData;
  }

  @Get()
  async findAll(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.factorySiteService.findAll(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.factorySiteService.findOne(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.update(id, data, token);
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
  async remove(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.factorySiteService.remove(id, token);
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
