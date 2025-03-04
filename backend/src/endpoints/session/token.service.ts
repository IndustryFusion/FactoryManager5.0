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

import { Injectable, UnauthorizedException } from '@nestjs/common';
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
      if(!tokenData) {
        const token = await this.authService.login(this.username, this.password);
        let tokenKey = 'token-storage';
        await this.redisService.saveData(tokenKey, token);
        return token.accessToken;
      } else {
        // verify the expiry
        const decodedToken = await jwt.decode(tokenData.accessToken);
        if(decodedToken && decodedToken.exp) {
          const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
          if (decodedToken.exp > currentTime) {
            return tokenData.accessToken;
          } else {
            const token = await this.authService.login(this.username, this.password);
            let tokenKey = 'token-storage';
            await this.redisService.saveData(tokenKey, token);
            return token.accessToken;
          }
        } else {
          throw new UnauthorizedException('Invalid token');
        }
      }
    }catch(err){
      return err;
    }
  }
}