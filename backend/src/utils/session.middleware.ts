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

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../endpoints/auth/auth.service'
import { RedisService } from '../endpoints/redis/redis.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService
  ) {}

  /**
   * Middleware responsible for handling user session tokens.
   * On receiving valid login credentials, it fetches access and refresh tokens
   * from the keyclock service and sets them in the user's session.
   */
  async use(req: Request & { session: any }, res: Response, next: Function) {

    const username = req.body.username;
    const password = req.body.password;
    try {
      const response = await this.authService.login(username, password);
      if(response.accessToken) {
        let tokenKey = 'token-storage';
        let tokenData = {
          'accessToken': response.accessToken,
          'refreshToken': response.refreshToken
        }
        await this.redisService.saveData(tokenKey, tokenData);
      } else {
        throw new HttpException('Invaid Credentials', HttpStatus.FORBIDDEN);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else if (error.response) {
        throw new HttpException({
          errorCode: `RD_${error.response.status}`,
          message: error.response.data.message
        }, error.response.status);
      } else {
        throw new HttpException({
          errorCode: "RD_500",
          message: error.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    next();
  }
}