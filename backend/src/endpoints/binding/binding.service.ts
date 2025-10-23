import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { CreateBindingDto } from './dto/create-binding.dto';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetService } from '../asset/asset.service';
import { TokenService } from '../session/token.service';
import { AlertsService } from '../alerts/alerts.service';
import { PgRestService } from '../pgrest/pgrest.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PostAssetDataInput {
  producerId: string;
  bindingId: string;
  data: CombinedPayload[];
}

export interface ValueEntry {
  timestamp: string; // ISO 8601 format
  data: {
    // Live data
    value?: string | number | boolean | null;
    metadata?: {
      unit?: string;
      segment?: string;
    };

    // Alert data
    severity?: string;
    message?: string;
    status?: string;
    alertType?: string;
  };
}

interface AlertaEntry {
  event: string;
  resource: string;
  severity: string;
  text: string;
  type: string;
  status: string;
  lastReceiveTime: string;
}

interface CombinedPayload {
  assetId: string;                          // ISO time aligned to interval
  data: {
    metadata?: Record<string, unknown>;
    static?: Record<string, unknown>;      // per attribute -> list of values in window
    live?: any;        // per attribute -> list of values in window
    alerts?: any;
  };
}


@Injectable()
export class BindingService {
  private readonly contractManagerUrl = process.env.CONTRACT_MANAGER_BACKEND_URL || "";
  private readonly connectorUrl = process.env.IFX_CONNECTOR_BACKEND_URL || "";
  private readonly companyIfricId = process.env.COMPANY_IFRIC_ID || 'urn:ifric:ifx-eur-com-nap-7f2f4f32-bbb4-5595-a73c-c3b1315744f2';
  private readonly ifxurl = process.env.IFX_PLATFORM_BACKEND_URL;
  private activeTasks = new Map<string, NodeJS.Timeout>();
  constructor(
    @InjectModel('PersistantTask') private readonly persistantModel: Model<any>,
    private readonly assetService: AssetService,
    private readonly tokenService: TokenService,
    private readonly alertsService: AlertsService,
    private readonly pgrestService: PgRestService
  ) { }

  mask(input: string, key: string): string {
    return input.split('').map((char, i) =>
      (char.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, '0')
    ).join('');
  }

  async onModuleInit() {
    await this.handleBindingBasedTasks(); // run once at startup
  }

  async create(data: CreateBindingDto) {
    try {
      const response = await axios.post(`${this.contractManagerUrl}/binding`, data);
      return response.data;
    } catch (err) {
      throw new InternalServerErrorException(`Failed to create binding: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleBindingBasedTasks() {
    const bindingTasks = await axios.get(`${this.contractManagerUrl}/tasks/producer/` + this.companyIfricId);
    for (const task of bindingTasks.data) {
      // Process each binding task
      if (!task.binding_mongo_url) {
        const body = {
          producerId: task.producerId,
          bindingId: task.bindingId,
          consumerId: task.consumerId,
        };
        const provisionResponse = await axios.post(`${this.connectorUrl}/producer/provision/`, body);
        if (provisionResponse.data) {
          // update binding with mongo details
          const updateBody = {
            binding_mongo_url: provisionResponse.data.mongoUrl,
            binding_mongo_database: provisionResponse.data.database,
            binding_mongo_collection: provisionResponse.data.collection,
            binding_mongo_username: provisionResponse.data.username,
            binding_mongo_password: provisionResponse.data.password,
          };
          const res = await axios.post(`${this.contractManagerUrl}/tasks/` + task._id, updateBody);
          if (!res) {
            console.error(`Failed to update binding task ${task._id} with provisioning details.`);
          }
        } else {
          console.error(`Provisioning failed for binding ${task.bindingId} and asset ${item.id}`);
        }

      }
    }
    await this.loadAndStartTasks(task);
  }
}

  async loadAndStartTasks(task: any) {
  console.log("Task list:", task);
  const taskId = task._id;
  if (this.activeTasks.has(taskId)) return;
  if (Date.now() >= new Date(task.expiry).getTime()) return;

  const intervalS = task.interval;
  const expiry = new Date(task.expiry);

  const timer = setInterval(async () => {
    if (Date.now() >= expiry.getTime()) {
      clearInterval(timer);
      this.activeTasks.delete(taskId);
      return;
    }
    await this.processTask(task);
  }, intervalS * 1000);

  this.activeTasks.set(taskId, timer);
}


extractMetadataFromParam(obj: Record<string, any>, param: string): Record < string, any > {
  const result: Record<string, any> = { };
const paramObject = obj[param];

if (!paramObject || typeof paramObject !== 'object') return result;
console.log("Extracting metadata from param:", paramObject);
for (const [key, value] of Object.entries(paramObject)) {
  // Skip top-level "value" and "type"
  if (key === 'value' || key === 'type') continue;

  // Check nested object validity
  if (
    key == 'observedAt' &&
    typeof value === 'string'
  ) {
    result[key] = value;
  }
}
console.log("Extracted metadata:", result);
return result;
  }


extractSelectiveNonRealtimeValues(
  obj: Record<string, any>,
  allowedKey: string
): string | number | boolean | null {

  const value = obj["https://industry-fusion.org/base/v0.1/" + allowedKey];
  if (
    value &&
    typeof value === 'object' &&
    value.type === 'Property' &&
    'value' in value
  ) {
    return value.value;
  }
  return null;
}


  async extractTimeSeriesValues(
  asset: any,
  token: string,
  key: string,
  interval: number
): Promise < ValueEntry[] > {

  const toStamp = new Date().toISOString();
  const fromStamp = new Date(Date.now() - interval * 1000).toISOString();
  const results: ValueEntry[] = [];

  const params = {
    intervalType: "custom",
    order: "observedAt.desc",
    entityId: `eq.${asset['id']}`,
    attributeId: `eq.https://industry-fusion.org/base/v0.1/${key}`,
    observedAt: `gte.${fromStamp}&observedAt=lt.${toStamp}`,
  };

  const timeSeries = await this.pgrestService.findAll(token, params, key);

  const attributeId = `https://industry-fusion.org/base/v0.1/${key}`;
  const assetProperty = asset[attributeId];

  if(!assetProperty || assetProperty.type !== 'Property') return results;

// ✅ Metadata: Extract from asset JSON-LD (no need to parse @context)
const unit = assetProperty["https://industry-fusion.org/base/v0.1/unit"]?.value;
const segment = assetProperty["https://industry-fusion.org/base/v0.1/segment"]?.value;

// ✅ Filter PGRest timeseries entries for this attribute
const matchingEntries = timeSeries.filter(
  (entry) => entry.attributeId === attributeId
);

// ✅ Transform into value objects
const values: ValueEntry[] = matchingEntries.map((entry) => ({
  timestamp: entry.observedAt,
  data: {
    value: entry
  }
}));

if (values.length > 0) {
  return values;
}

return values;
  }

extractAlertValues(
  alertList: AlertaEntry[],
  key: string
): Record < string, ValueEntry[] > {
  const attributeId = `https://industry-fusion.org/base/v0.1/${key}`;

  // Match alerts where event contains the attribute URI
  const matchingAlerts = Array.isArray(alertList) ? alertList.filter((alert) =>
    alert.event?.includes(attributeId)
  ) : [];

  const values: ValueEntry[] = matchingAlerts.map((alert) => ({
    timestamp: alert.lastReceiveTime,
    data: {
      severity: alert.severity,
      message: alert.text,
      status: alert.status,
      alertType: alert.type
    }
  }));

  if(values.length > 0) {
  return { values };
}

return {};
  }


  async postAssetData(input: PostAssetDataInput) {
  const {
    producerId,
    bindingId,
    data
  } = input;

  const payload = {
    producerId,
    bindingId,
    data
  };

  console.log("Payload for posting asset data:", payload);

  try {
    const response = await axios.post(
      this.connectorUrl + "/producer/publish-data-to-dataroom",
      payload
    );
    return response.data;
  } catch (error) {
    console.error(`Error posting data for binding ${bindingId}:`, error);
    throw new InternalServerErrorException(
      `Failed to post data for binding ${bindingId}: ${error.message}`
    );
  }
}


  private async processTask(task: any) {
  // Your actual data handling logic
  console.log(`Running task ${task.id}:`, task);
  let taskSubmitData = [];
  const token = await this.tokenService.getToken();
  if (task.assetId.length !== 0) {
    for (const id of task.assetId) {
      let combinedPayload: CombinedPayload = {
        assetId: id,
        data: {}
      };
      const asset = await this.assetService.getAssetDataById(id, token);
      for (const key1 of task.assetProperties) {
        for (const key of task.dataType) {
          if (key === 'metadata') {
            const metadata = await this.extractMetadataFromParam(asset, "https://industry-fusion.org/base/v0.1/" + key1);
            if (Object.keys(metadata).length === 0) continue;
            combinedPayload.data['metadata'] = { [key1]: metadata || {} };
          }
          if (key == 'static') {
            const staticData = await this.extractSelectiveNonRealtimeValues(asset, key1);
            if (!staticData) continue;
            combinedPayload.data['static'] = { [key1]: staticData || {} };
          }
          if (key == 'live') {
            const liveData = await this.extractTimeSeriesValues(asset, token, key1, task.interval);
            if (Object.keys(liveData).length === 0) continue;
            combinedPayload.data['live'] = liveData || {};
          }
          if (key == 'alerts') {
            const alerts = await this.alertsService.findOne(id);
            const alertData = this.extractAlertValues(alerts["alerts"], key1);
            if (Object.keys(alertData).length === 0) continue;
            combinedPayload.data['alerts'] = alertData.values || {};
          }
        }
      }
      taskSubmitData.push(combinedPayload);
      const res = await this.postAssetData({
        producerId: task.producerId,
        bindingId: task.bindingId,
        data: taskSubmitData
      });
      if (res) {
        console.log("Data shared to producerId:", task.bindingId);
      } else {
        console.error(`Failed to post asset data for data sharing for asset`);
      }
    }
  } else {
    // call get company owner assets.
    const token = await this.tokenService.getToken();
    const companyAssets = await this.assetService.getAllAssets(token);
    for (const item of companyAssets) {
      let combinedPayload: CombinedPayload = {
        assetId: item.id,
        data: {}
      };

      const asset = await this.assetService.getAssetDataById(item.id, token);
      for (const key1 of task.assetProperties) {
        for (const key of task.dataType) {
          if (key === 'metadata') {
            const metadata = await this.extractMetadataFromParam(asset, "https://industry-fusion.org/base/v0.1/" + key1);
            if (Object.keys(metadata).length === 0) continue;
            combinedPayload.data['metadata'] = { [key1]: metadata || {} };
          }
          if (key == 'static') {
            const staticData = await this.extractSelectiveNonRealtimeValues(asset, key1);
            if (!staticData) continue;
            combinedPayload.data['static'] = { [key1]: staticData || {} };
          }
          if (key == 'live') {
            const liveData = await this.extractTimeSeriesValues(asset, token, key1, task.interval);
            if (!liveData) continue;
            combinedPayload.data['live'] = liveData || {};
          }
          if (key == 'alerts') {
            const alerts = await this.alertsService.findOne(item.id);
            const alertData = this.extractAlertValues(alerts["alerts"], key1);
            if (Object.keys(alertData).length === 0) continue;
            combinedPayload.data['alerts'] = alertData || {};
          }
        }
      }
      taskSubmitData.push(combinedPayload);
    }

    const res = this.postAssetData({
      producerId: task.producerId,
      bindingId: task.bindingId,
      data: taskSubmitData
    });

    if (res) {
      console.log("Data shared to producerId:", task.bindingId);
    } else {
      console.error(`Failed to post asset data for data sharing for asset`);
    }
  }
}
}
