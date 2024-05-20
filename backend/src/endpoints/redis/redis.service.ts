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
  private readonly CREDENTIALS_KEY = `global:credentials`;
  private readonly STORED_DATA_KEY = `global:storedData`;
    private readonly CREDENTIALS_KEY_PREFIX = 'credentials';
   private readonly TOKEN_PREFIX = 'token:';
  
//   private readonly REDIS_SERVER =  JSON.stringify(process.env.REDIS_SERVE);
//   private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT, 10) || 6379 ;
 
//  constructor() {
//     this.redisClient = new Redis({host: this.REDIS_SERVER, port: this.REDIS_PORT});

//  }

  private readonly REDIS_SERVER =  process.env.REDIS_SERVER;
  private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT)  ;
  constructor() {
    this.redisClient = new Redis({ host:this.REDIS_SERVER, port: Number(this.REDIS_PORT)});
  }
  async credentialsChanged(token: string, queryParams: any, entityId: string, attributeId?: string): Promise<boolean> {
    const currentCredentials = await this.getTokenAndEntityId();
    if (!currentCredentials) return true; // If there are no credentials, they "changed"

    // Compare the current credentials with the new ones
    return !(
      currentCredentials.entityId === entityId &&
      isEqual(currentCredentials.queryParams, queryParams)
    );
  }

  // Enhanced to include queryParams in the stored data
   async saveTokenAndEntityId(token: string, queryParams: any, entityId: string, attributeId?: string): Promise<void> {
    const dataToStore = { token, queryParams, entityId };
    if (attributeId) {
        dataToStore['attributeId'] = attributeId;
    }
    await this.redisClient.set(this.CREDENTIALS_KEY, JSON.stringify(dataToStore), 'EX', 36000);
}


  // Returns an enhanced object including queryParams
  async getTokenAndEntityId(): Promise<{ token: string; queryParams: any; entityId: string } | null> {
 
    const result = await this.redisClient.get(this.CREDENTIALS_KEY);
    if (result) {
      const parsedResult = JSON.parse(result);
     
      return parsedResult;
    }
    return null;
  }
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
  // Checks if the token has changed for the given key
  async tokenHasChanged(key: string, newToken: string): Promise<boolean> {
    const currentToken = await this.redisClient.get(`${this.TOKEN_PREFIX}${key}`);
    return currentToken !== newToken;
  }

  // Saves data with an associated token to track changes
  async saveDataWithToken(key: string, data: any, token: string, ttl?: number): Promise<void> {
    // Save the data
    if (typeof ttl === 'number') {
      await this.redisClient.set(key, JSON.stringify(data), 'EX', ttl);
    } else {
      await this.redisClient.set(key, JSON.stringify(data));
    }
    // Associate the current token with this data
    await this.redisClient.set(`${this.TOKEN_PREFIX}${key}`, token, 'EX', ttl);
  }
 async getAllCredentials(): Promise<Array<{ token: string; queryParams: any; entityId: string; attributeId?: string }>> {
        try {
            const keys = await this.redisClient.keys(`${this.CREDENTIALS_KEY_PREFIX}:*`);
            const credentialsList = [];

            for (const key of keys) {
                const serializedData = await this.redisClient.get(key);
                if (serializedData) {
                    const data = JSON.parse(serializedData);
                    credentialsList.push(data);
                }
            }

            return credentialsList;
        } catch (error) {
            return [];
        }
    }


}
