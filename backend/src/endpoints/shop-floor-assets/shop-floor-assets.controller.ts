import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { ShopFloorAssetsService } from './shop-floor-assets.service';
import { getSessionToken } from '../session/session.service';
import { Request, Response } from 'express';

@Controller('shop-floor-assets')
export class ShopFloorAssetsController {
  constructor(private readonly shopFloorAssetsService: ShopFloorAssetsService) {}

  @Get()
  async findAll(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.shopFloorAssetsService.findAll(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
