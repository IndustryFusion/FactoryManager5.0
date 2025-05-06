import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePersistantTaskDto } from './dto/persistant-task.dto';

@Injectable()
export class BindingService implements OnModuleInit {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  private activeTasks = new Map<string, NodeJS.Timeout>();
  constructor(
    @InjectModel('PersistantTask') private readonly persistantModel: Model<any>,
  ) { }

  async onModuleInit() {
    await this.loadAndStartTasks(); // run once at startup
  }

  async create(data: CreateBindingDto) {
    try {
      const response = await axios.post(`${this.ifxUrl}/binding`, data);
      return response.data;
    } catch (err) {
      throw new InternalServerErrorException(`Failed to create binding: ${err.message}`);
    }
  }

  async handleBinding(producerId: string, bindingId: string, assetId: string, contractId: string) {
    try {
      const contract = await axios.get(`${this.ifxUrl}/contract/` + contractId);
      const payload: CreatePersistantTaskDto = {
        producerId,
        bindingId,
        assetId,
        contractId,
        interval: contract.data.interval, // default interval
        expiry: new Date(contract.data.contract_valid_till).toISOString(), // default expiry 1 hour from now
        dataType: contract.data.data_type, // default data type
        assetProperties: contract.data.asset_properties
      };
      const task = new this.persistantModel({ payload });
      task.save();
      await this.loadAndStartTasks()
      return { status: 'success', message: 'Binding task started successfully' };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to handle binding: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR) // optional: refresh tasks hourly
  async loadAndStartTasks() {
    const taskList = await this.persistantModel.find();
    for (const task of taskList) {
      const taskId = task._id;
      if (this.activeTasks.has(taskId)) continue;

      const intervalMs = task.interval;
      const expiry = new Date(task.expiry);

      const timer = setInterval(async () => {
        if (Date.now() >= expiry.getTime()) {
          clearInterval(timer);
          this.activeTasks.delete(taskId);
          return;
        }

        await this.processTask(task);
      }, intervalMs);

      this.activeTasks.set(taskId, timer);
    }
  }

  private async processTask(task: any) {
    // Your actual data handling logic
    console.log(`Running task ${task.id}:`, task);

    // Fetch data based on task and send it to connector
  }

}
