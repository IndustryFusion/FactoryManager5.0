import { Controller, Get, Post, Body, Patch, Param, Delete, Session, NotFoundException } from '@nestjs/common';
import { AlertsService } from './alerts.service';

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
}
