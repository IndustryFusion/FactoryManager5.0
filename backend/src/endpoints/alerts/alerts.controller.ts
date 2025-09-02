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

import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertStatusDto } from './dto/alerta-status.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll() {
    try {
      return this.alertsService.findAll();
    } catch (err) {
      throw new Error("Alerta error " + err);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    try {
      return this.alertsService.findOne(id);
    } catch (err) {
      throw new NotFoundException();
    }
  }


  @Post('/:id/status')
  updateStatus(@Param('id') id: string, @Body() data: AlertStatusDto) {
    try {
      return this.alertsService.updateStatus(id, data);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
