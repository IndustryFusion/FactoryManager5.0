import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePersistantTaskDto } from './dto/persistant-task.dto';
import { AssetService } from '../asset/asset.service';
import { TokenService } from '../session/token.service';
import { AlertsService } from '../alerts/alerts.service';

interface PostAssetDataInput {
  producerId: string;
  bindingId: string;
  assetId: string;
  assetType: string;
  dataType: string;
  attribute: string;
  value: any; // e.g. extracted key-value pairs from your previous step
  message?: string;
  severity?: string;
  alertReceiveTime?: string;
}


@Injectable()
export class BindingService implements OnModuleInit {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  private readonly ifxConnectorUrl = process.env.IFX_CONNECTOR_BACKEND_URL;
  private activeTasks = new Map<string, NodeJS.Timeout>();
  constructor(
    @InjectModel('PersistantTask') private readonly persistantModel: Model<any>,
    private readonly assetService: AssetService,
    private readonly tokenService: TokenService,
    private readonly alertsService: AlertsService
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
      console.log("Payload for binding task:", payload);
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
    console.log("Task list:", taskList);
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


  extractMetadataFromParam(obj: Record<string, any>, param: string): Record<string, any> {
    const result: Record<string, any> = {};
    const paramObject = obj[param];

    if (!paramObject || typeof paramObject !== 'object') return result;

    for (const [key, value] of Object.entries(paramObject)) {
      // Skip top-level "value" and "type"
      if (key === 'value' || key === 'type') continue;

      // Check nested object validity
      if (
        value &&
        typeof value === 'object' &&
        typeof value === 'object' && value !== null && 'type' in value && value.type === 'Property' &&
        'value' in value
      ) {
        result[key] = value.value;
      }
    }

    console.log("Extracted metadata:", result);

    return result;
  }


  extractSelectiveNonRealtimeValues(
    obj: Record<string, any>,
    allowedKeys: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key of allowedKeys) {
      const value = obj["https://industry-fusion.org/base/v0.1/" + key];
      if (
        value &&
        typeof value === 'object' &&
        value.type === 'Property' &&
        'value' in value
      ) {
        const segment = value['https://industry-fusion.org/base/v0.1/segment']?.value;
        if (segment !== 'realtime' && segment !== 'component') {
          result["https://industry-fusion.org/base/v0.1/" + key] = value.value;
        }
      }
    }
    console.log("Extracted non-realtime values:", result);
    return result;
  }


  extractSelectiveRealtimeValues(
    obj: Record<string, any>,
    allowedKeys: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key of allowedKeys) {
      const value = obj["https://industry-fusion.org/base/v0.1/" + key];
      if (
        value &&
        typeof value === 'object' &&
        value.type === 'Property' &&
        'value' in value
      ) {
        const segment = value['https://industry-fusion.org/base/v0.1/segment']?.value;
        if (segment == 'realtime') {
          result["https://industry-fusion.org/base/v0.1/" + key] = value.value;
        }
      }
    }
    console.log("Extracted realtime values:", result);
    return result;
  }


  async postAssetData(input: PostAssetDataInput) {
    const {
      producerId,
      bindingId,
      assetId,
      dataType,
      assetType,
      attribute,
      value,
      message = '',
      severity = '',
      alertReceiveTime = '',
    } = input;


    const payload = {
      producerId: producerId,
      bindingId: bindingId,
      assetId: assetId,
      dataType: dataType,
      assetType: assetType,
      attribute: attribute,
      value: value, // ensure value is a string
      message: message,
      severity: severity,
      alertReceiveTime: alertReceiveTime,
    };
    console.log("Payload for posting asset data:", payload);
    try {
      await axios.post(this.ifxConnectorUrl + "/producer/publish-data-to-dataroom", payload);
    } catch (error) {
      console.error(`Error posting data for ${attribute}:`, error);
      throw new InternalServerErrorException(`Failed to post data for ${attribute}: ${error.message}`);
    }

  }


  private async processTask(task: any) {
    // Your actual data handling logic
    console.log(`Running task ${task.id}:`, task);
    const token = await this.tokenService.getToken();
    const asset = this.assetService.getAssetDataById(task.assetId, token);
    console.log("Asset data:", asset);

    for (const key in task.dataType) {
      if (task.dataType === 'metadata') {
        for (const key1 in task.assetProperties) {
          const metadata = this.extractMetadataFromParam(asset, "https://industry-fusion.org/base/v0.1/" + key1);
          this.postAssetData({
            producerId: task.producerId,
            bindingId: task.bindingId,
            assetId: task.assetId,
            assetType: asset["type"],
            dataType: key,
            attribute: "https://industry-fusion.org/base/v0.1/" + key1,
            value: metadata
          });
        }
      }

      if (task.dataType === 'static') {
        const staticData = this.extractSelectiveNonRealtimeValues(asset, task.assetProperties);
        for (const key1 in task.assetProperties) {
          this.postAssetData({
            producerId: task.producerId,
            bindingId: task.bindingId,
            assetId: task.assetId,
            assetType: asset["type"],
            dataType: key,
            attribute: "https://industry-fusion.org/base/v0.1/" + key1,
            value: staticData["https://industry-fusion.org/base/v0.1/" + key1]
          });
        }
      }

      if (task.dataType === 'live') {
        const live = this.extractSelectiveRealtimeValues(asset, task.assetProperties);
        for (const key1 in task.assetProperties) {
          this.postAssetData({
            producerId: task.producerId,
            bindingId: task.bindingId,
            assetId: task.assetId,
            assetType: asset["type"],
            dataType: key,
            attribute: "https://industry-fusion.org/base/v0.1/" + key1,
            value: live["https://industry-fusion.org/base/v0.1/" + key1]
          });
        }
      }

      if (task.dataType === 'alerts') {
        const alerts = await this.alertsService.findOne(task.assetId);
        for (const alert of alerts) {
          if (alert["status"] !== "open") continue;
          this.postAssetData({
            producerId: task.producerId,
            bindingId: task.bindingId,
            assetId: task.assetId,
            assetType: asset["type"],
            dataType: key,
            attribute: "",
            value: alert["event"],
            message: alert["text"],
            severity: alert["severity"],
            alertReceiveTime: alert["receiveTime"]
          });
        }
      }
    }
  }
}
