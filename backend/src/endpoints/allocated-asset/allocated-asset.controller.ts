import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AllocatedAssetService } from './allocated-asset.service';
import { getSessionToken } from '../session/session.service';

@Controller('allocated-asset')
export class AllocatedAssetController {
  constructor(private readonly allocatedAssetService: AllocatedAssetService) {}

  @Post()
  async create(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.create(token);
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

  @Get()
  async findAll(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.allocatedAssetService.findAll(token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch()
  async update(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.update(token);
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
  async remove(@Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      let response = await this.allocatedAssetService.remove(token);
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