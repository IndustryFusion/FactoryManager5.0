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

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AuthService } from "../auth/auth.service";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TokenService {
  constructor(
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}
  private readonly username = process.env.USERNAME;
  private readonly password = process.env.PASSWORD;
  getToken = async () => {
    try{
      let tokenData = await this.redisService.getData('token-storage');

      if(!tokenData|| this.isTokenExpired(tokenData.accessToken)) {
        const token = await this.authService.login(this.username, this.password);
        let tokenKey = 'token-storage';
        const lockKey = 'token-refresh-lock';

        const lock = await this.redisService.saveData(lockKey, 'locked', 10);
        if (lock) {
          // This process has the lock, fetch new token
          const newToken = await this.authService.login(this.username, this.password);
          await this.redisService.saveData(tokenKey, newToken);
          await this.redisService.deleteKey(lockKey); // release lock
          return newToken.accessToken;
        } else {
          // Another process is refreshing; wait a bit and try again
          await this.sleep(1000); // wait 1s
          return await this.getToken(); // retry
        }
      } else {
          return tokenData.accessToken;
      }
    }catch(err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `RD_${err.response.status}`,
          message: err.response.data.message
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "RD_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  isTokenExpired = (accessToken: string): boolean => {
    const decoded = jwt.decode(accessToken);
    if (!decoded || !decoded.exp) return true;
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime;
  }
  sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
}