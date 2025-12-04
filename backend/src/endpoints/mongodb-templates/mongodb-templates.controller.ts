// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//   http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Controller, Get, NotFoundException, Query, Param, Patch, Body } from '@nestjs/common';
import { MongodbTemplatesService } from './mongodb-templates.service';

@Controller('mongodb-templates')
export class MongodbTemplatesController {
  constructor(private readonly mongodbTemplatesService: MongodbTemplatesService) {}

  @Get()
  async getTemplates() {
    try {
      return await this.mongodbTemplatesService.getTemplates();
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async getTemplateById(@Param('id') id: string){
    try {
      return await this.mongodbTemplatesService.getTemplateById(id);
    } catch (err) {
      throw err;
    }
  }

  @Get('/type/:type')
  async getTemplateByType(@Param('type') type: string){
    try {
      return await this.mongodbTemplatesService.getTemplateByType(type);
    } catch (err) {
      throw err;
    }
  }

}
