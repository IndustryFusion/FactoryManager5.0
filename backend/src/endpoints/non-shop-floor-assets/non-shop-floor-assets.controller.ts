import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { NonShopFloorAssetsService } from './non-shop-floor-assets.service';
import { getSessionToken } from '../session/session.service';
import { Request, Response } from 'express';

@Controller('non-shop-floor-assets')
export class NonShopFloorAssetsController {
  constructor(private readonly nonShopFloorAssetsService: NonShopFloorAssetsService) {}

  @Get(':id')
  async findAll(@Param('id') id: string, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return this.nonShopFloorAssetsService.findAll(id, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
