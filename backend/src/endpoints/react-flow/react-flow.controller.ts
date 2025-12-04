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

import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException,Req,Query } from '@nestjs/common';
import { ReactFlowService } from './react-flow.service';
import { ReactFlowDto } from './dto/react-flow.dto';
import { TokenService } from '../session/token.service';

@Controller('react-flow')
export class ReactFlowController {
  constructor(
    private readonly reactFlowService: ReactFlowService,
    private readonly tokenService: TokenService
  ) {}

  @Post()
  async create(@Body() data: ReactFlowDto) {
    try {
      const response = await this.reactFlowService.create(data);
      return response;
    } catch(err) {
      throw err;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const response = await this.reactFlowService.findOne(id);
      return response;
    } catch(err) {
      throw err;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: ReactFlowDto) {
    try {
      const response = await this.reactFlowService.update(id, data);
      return response;
    } catch(err) {
      throw err;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const response = await this.reactFlowService.remove(id);
      return response;
    } catch(err) {
      throw err;
    }
  }
 
  @Get('/react-flow-update/:id')
  async findFactoryAndShopFloors(@Param('id') id: string)  {
    try {
      const token = await this.tokenService.getToken();
      const response = await this.reactFlowService.findFactoryAndShopFloors(id,token);
      
      return response;
    } catch(err) {
      throw err;
    }
  }
}
