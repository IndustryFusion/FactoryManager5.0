import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import {isEqual} from 'lodash'

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private readonly CREDENTIALS_KEY = `global:credentials`;
  private readonly STORED_DATA_KEY = `global:storedData`;
  private readonly REDIS_SERVER =  JSON.stringify(process.env.REDIS_SERVER);
  private readonly REDIS_PORT: number = parseInt(<string>process.env.REDIS_PORT, 10) || 6379 ;

  constructor() {
    this.redisClient = new Redis({host: this.REDIS_SERVER, port: this.REDIS_PORT});
  }

  async credentialsChanged(token: string, queryParams: any, entityId: string): Promise<boolean> {
  const currentCredentials = await this.getTokenAndEntityId();
  if (!currentCredentials) return true; // If there are no credentials, they "changed"
  
  // Compare the current credentials with the new ones
  return !(
           currentCredentials.entityId === entityId &&
           isEqual(currentCredentials.queryParams, queryParams));
}

  // Enhanced to include queryParams in the stored data
  async saveTokenAndEntityId(token: string, queryParams: any, entityId: string): Promise<void> {
 
    await this.redisClient.set(this.CREDENTIALS_KEY, JSON.stringify({ token, queryParams, entityId }), 'EX', 36000);
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
  async saveData(key: string, data: any): Promise<void> {
 
  await this.redisClient.set(key, JSON.stringify(data), 'EX', 36000); 
}

}
