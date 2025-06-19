import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BindingService } from './binding.service';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';

@Controller('binding')
export class BindingController {
  constructor(private readonly bindingService: BindingService) {}

  @Post()
  create(@Body() createBindingDto: CreateBindingDto) {
    return this.bindingService.create(createBindingDto);
  }

  @Post('start-publish')
  async startBindingTask(
    @Body() body: { producerId: string; bindingId: string; assetId: string, contractId: string },
  ) {
    return this.bindingService.handleBinding(body.producerId, body.bindingId, body.assetId, body.contractId);
  }
}
