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

import { Controller, Post, Delete, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../session/token.service';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: TokenService
  ){}

  @Post('login')
  async getSession(@Session() session: Record<string, any>) {
    try {
        const tokenData = await this.tokenService.getToken();
        console.log('token data ',tokenData);
        if(tokenData && tokenData.length > 0){
          return {
            success: true,
            status: '201',
            message: 'Logged In successfully'
          }
        }
        const token = {
          access_token: session.accessToken,
          refresh_token: session.refreshToken
        };
        return Promise.resolve(token);
    } catch (err) {
      console.log('err ',err);
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      }
    }
  }
}
