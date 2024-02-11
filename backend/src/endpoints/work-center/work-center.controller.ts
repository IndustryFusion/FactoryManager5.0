import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException, Req } from '@nestjs/common';
import { WorkCenterService } from './work-center.service';
import { Request, Response } from 'express';
import * as jsonData from './work-center-schema.json';
import { getSessionToken } from '../session/session.service';
import axios from 'axios';

@Controller('work-center')
export class WorkCenterController {
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  constructor(private readonly workCenterService: WorkCenterService) {}

  @Post()
  async create(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.workCenterService.create(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText'],
        }
      }
      else {
        console.log("Error: " + response)
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
  async findAll(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.workCenterService.findAll(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.workCenterService.findOne(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.workCenterService.update(id, data, token);
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
      const response = await this.workCenterService.remove(id, token);
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
