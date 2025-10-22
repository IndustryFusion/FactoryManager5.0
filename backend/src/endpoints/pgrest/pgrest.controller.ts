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
import { TokenService } from '../session/token.service';
@Injectable()
@Controller('pgrest')
export class PgRestController {
  constructor(
    private readonly pgRestService: PgRestService,
    private readonly tokenService: TokenService
  ) {}

  @Get()
  async findAll(@Query() queryParams: any, key: string) {
    try{
      let token = await this.tokenService.getToken();
      return this.pgRestService.findAll(token, queryParams, key);
    } catch(err) {
      throw new NotFoundException("Error finding the details: " + err);
    }
  }
}
