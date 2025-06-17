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

import { Injectable,Logger  } from '@nestjs/common';
import Redis from 'ioredis';
import {isEqual} from 'lodash'
import { Cluster } from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private readonly REDIS_SERVER =  process.env.REDIS_SERVER;
  private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT)  ;
  constructor() {
    this.redisClient = new Redis({ host:this.REDIS_SERVER, port: Number(this.REDIS_PORT)});
    this.redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  // Returns Value for Specific Key
  async getData(key: string, retryAttempts = 3): Promise<any> {
    try {
      const result = await this.redisClient.get(key);
      if (result) {
        return JSON.parse(result);
      }
      return null;
    } catch (error) {
      if (error.code === 'MOVED' && retryAttempts > 0) {
        return this.getData(key, retryAttempts - 1);
      }
      throw error;
    }
  }

  // Returns Value for Specific Key
  async saveData(key: string, data: any, ttl?: number, retryAttempts = 3): Promise<boolean> {
    try {
      const result = await (typeof ttl === 'number'
        ? this.redisClient.set(key, JSON.stringify(data), 'EX', ttl)
        : this.redisClient.set(key, JSON.stringify(data)));
      return result === "OK";
    } catch (error) {
      if (error.code === 'MOVED' && retryAttempts > 0) {
        return this.saveData(key, data, ttl, retryAttempts - 1);
      }
      throw error;
    }
  }

  async deleteKey(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

}
