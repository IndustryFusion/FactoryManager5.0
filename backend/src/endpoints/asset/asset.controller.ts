import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Req, Res, Session, Query } from '@nestjs/common';
import { AssetService } from './asset.service';
import { Request, Response } from 'express';
import { TemplateDescriptionDto } from '../templates/dto/templateDescription.dto';
import { getSessionToken } from '../session/session.service';

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  async getAssetData(@Req() req: Request, @Query('type') type: string) {
    try {
      const token = await getSessionToken(req);
      if (type) {
        return this.getAssetByType(type, token);
      } else {
      console.log('im here')
      return await this.assetService.getAssetData(token);
      }
    } catch (err) {
      throw new NotFoundException("Error fetching assets " + err);
    }
  }

  @Get('type=:type')
  async getAssetByType(type: string, token: string) {
    try {
      return await this.assetService.getAssetByType(type, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id')
  async getAssetDataById(@Param('id') id: string, @Req() req: Request) {
    try {
      console.log('inside asset data func');
      const token = await getSessionToken(req);
      return await this.assetService.getAssetDataById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get(':id/keyvalues')
  async getkeyValuesById(@Param('id') id: string, @Req() req: Request) {
    try {
      console.log('inside keyvalues func');
      const token = await getSessionToken(req);
      return await this.assetService.getkeyValuesById(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Post()
  async setAssetData( @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.assetService.setAssetData(data, token);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['statusText'],
          id: response['id'],
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
  async updateRelations(@Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      const response = await this.assetService.updateRelations(data, token);
      console.log(response);
      if(response['status'] == "200") {
        return {
          success: true,
          status: response['status'],
          message: response['message']
        }
      }
    } catch (err) {
      return { 
        success: false,
        message: "Error while updating asset relationships"
      };
    }
  }

  @Patch(':id')
  async updateAssetById(@Param('id') id: string, @Body() data, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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

  @Delete(':id')
  async deleteAssetById(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
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