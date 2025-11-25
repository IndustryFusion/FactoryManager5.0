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

import { Controller, Post, Delete, Session, Req, Body, UseGuards, Get, Param, Query, Patch } from '@nestjs/common';
import { TokenService } from '../session/token.service';
import { FindIndexedDbAuthDto, EncryptRouteDto, CompanyTwinDto } from './dto/token.dto';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly authService: AuthService
  ){}

  @Post('login')
  async getSession(@Session() session: Record<string, any>) {
    try {
        const tokenData = await this.tokenService.getToken();
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
      return { 
        success: false, 
        status: err.response.status,
        message: err.response.data 
      }
    }
  }

  @UseGuards(AuthGuard)
  @Post('encrypt-route')
  encryptRoute(@Body() data: EncryptRouteDto, @Req() req: Request) {
    try {
      return this.authService.encryptRoute(data, req);
    } catch (err) {
      throw err;
    }
  }

  @Post('decrypt-route')
  decryptRoute(@Body() data: FindIndexedDbAuthDto) {
    try {
      return this.authService.decryptRoute(data);
    } catch (err) {
      throw err;
    }
  }

  @Post('generate-token')
  generateToken(@Body() data: Record<string, any>) {
    return this.authService.generateToken(data);
  }

  @UseGuards(AuthGuard)
  @Get('/get-user-details-by-email/:email')
  getUserDetailsByEmail(@Param('email') email: string, @Req() req: Request) {
    return this.authService.getUserDetailsByEmail(email, req);
  }

  @UseGuards(AuthGuard)
  @Get('/get-company-details/:company_ifric_id')
  getCompanyDetails(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    return this.authService.getCompanyDetails(company_ifric_id, req);
  }

  @UseGuards(AuthGuard)
  @Get('/get-company-details-id/:id')
  getCompanyDetailsByID(@Param('id') id: string, @Req() req: Request) {
    return this.authService.getCompanyDetailsbyRecord(id, req);
  }

  @UseGuards(AuthGuard)
  @Get('/get-category-specific-company/:categoryName')
  getCategorySpecificCompanies(@Param('categoryName') categoryName: string, @Req() req: Request) {
    return this.authService.getCategorySpecificCompanies(categoryName, req);
  }

  @UseGuards(AuthGuard)
  @Get('/get-user-details')
  getUserDetails(@Query('user_email') user_email: string, @Query('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    return this.authService.getUserDetails(user_email, company_ifric_id, req);
  }

  @UseGuards(AuthGuard)
  @Get('/get-company-products/:company_ifric_id')
  getCompanyProducts(@Param('company_ifric_id') company_ifric_id: string, @Req() req: Request) {
    return this.authService.getCompanyProducts(company_ifric_id, req);
  }

  @Get('authenticate-token/:ifricdi')
  authenticateToken(@Param('ifricdi') ifricdi: string) {
    return this.authService.authenticateToken(ifricdi);
  }

  @UseGuards(AuthGuard)
  @Patch('/update-company-twin')
  updateCompanyTwin(@Body() data: CompanyTwinDto, @Req() req: Request) {
    return this.authService.updateCompanyTwin(data, req);
  }
  
}
