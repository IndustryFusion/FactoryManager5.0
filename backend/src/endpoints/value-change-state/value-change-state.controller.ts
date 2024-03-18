import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ValueChangeStateService } from './value-change-state.service';
import { getSessionToken } from '../session/session.service';

@Controller('value-change-state')
export class ValueChangeStateController {
  constructor(private readonly valueChangeStateService: ValueChangeStateService) {}

  @Get()
  async findOne(@Query() queryParams: any, @Req() req: Request) {
    try {
      const token = await getSessionToken(req);
      return await this.valueChangeStateService.findOne(queryParams, token);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
