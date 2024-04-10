import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import {isEqual} from 'lodash'

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private readonly CREDENTIALS_KEY = `global:credentials`;
  private readonly STORED_DATA_KEY = `global:storedData`;
   private readonly TOKEN_PREFIX = 'token:';
  
//   private readonly REDIS_SERVER =  JSON.stringify(process.env.REDIS_SERVE);
//   private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT, 10) || 6379 ;
 
//  constructor() {
//     this.redisClient = new Redis({host: this.REDIS_SERVER, port: this.REDIS_PORT});

//  }

  private readonly REDIS_SERVER =  process.env.REDIS_SERVER;
  private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT, 10) || 6379 ;

  constructor() {
    this.redisClient = new Redis({host: "localhost", port: 6379});
  }
  async credentialsChanged(token: string, queryParams: any, entityId: string): Promise<boolean> {
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
   async getData(key: string): Promise<any> {
    
    const result = await this.redisClient.get(key);
    if (result) {
      const parsedResult = JSON.parse(result);
     
      return parsedResult;
    }
    return null;
  }
  async saveData(key: string, data: any, ttl?: number): Promise<void> {
    if (typeof ttl === 'number') {
      await this.redisClient.set(key, JSON.stringify(data), 'EX', ttl);
    } else {
      await this.redisClient.set(key, JSON.stringify(data));
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
}
