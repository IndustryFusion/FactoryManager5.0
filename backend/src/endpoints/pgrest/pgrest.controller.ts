// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

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
