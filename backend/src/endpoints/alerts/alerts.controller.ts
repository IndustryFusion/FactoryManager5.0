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
}