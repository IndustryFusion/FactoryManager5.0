import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Session, NotFoundException, Req,Injectable } from '@nestjs/common';
import { PgRestService } from './pgrest.service';
import { Request } from 'express';
import { getSessionToken } from '../session/session.service';
@Injectable()
@Controller('pgrest')
export class PgRestController {
  constructor(private readonly pgRestService: PgRestService) {}

  @Post()
  create() {
    return this.pgRestService.create();
  }

  @Get()
  async findAll(@Query() queryParams: any, @Req() req: Request) {
    const { entityId } = queryParams;
    try{
      let token = await getSessionToken(req);
      return this.pgRestService.findAll(token, queryParams);
    } catch(err) {
      throw new NotFoundException("Error finding the details: " + err);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pgRestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.pgRestService.update(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pgRestService.remove(id);
  }

  
}
