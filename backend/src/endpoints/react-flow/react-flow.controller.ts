import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { ReactFlowService } from './react-flow.service';
import { ReactFlowDto } from './dto/react-flow.dto';

@Controller('react-flow')
export class ReactFlowController {
  constructor(private readonly reactFlowService: ReactFlowService) {}

  @Post()
  async create(@Body() data: ReactFlowDto) {
    try {
      const response = await this.reactFlowService.create(data);
      return response;
    } catch(err) {
      return err.response;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const response = await this.reactFlowService.findOne(id);
      return response;
    } catch(err) {
      return err.response;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: ReactFlowDto) {
    try {
      const response = await this.reactFlowService.update(id, data);
      return response;
    } catch(err) {
      return err.response;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const response = await this.reactFlowService.remove(id);
      return response;
    } catch(err) {
      return err.response;
    }
  }
}
