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

import { Controller, Post, Delete, Req, Body, UseGuards, Get, Param, Query, Patch } from '@nestjs/common';
import { FindIndexedDbAuthDto, EncryptRouteDto, CompanyTwinDto, LoginDto } from './dto/token.dto';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ){}

  // Deliberately not behind AuthGuard. This is the endpoint a client calls
  // *because* its access token has expired, so requiring one would make it
  // unreachable exactly when it is needed. The ifricdr in the body is the
  // credential.
  @Post('refresh')
  refreshSession(@Body('ifricdr') ifricdr: string) {
    return this.authService.refreshSession(ifricdr);
  }

  // A user signs in through the IFRIC Registry, like every other app: the
  // response carries the masked `ifricdi` / `ifricdr` pair the frontend stores
  // and refreshes. This used to log in to the IFF platform's Keycloak and keep
  // one server-wide token in Redis; that token is the backend's own service
  // credential and TokenService still obtains it by itself from USERNAME and
  // PASSWORD, so no user login is needed for it.
  @Post('login')
  userLogin(@Body() data: LoginDto) {
    return this.authService.logIn(data);
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

  // Server-to-server, from IFX Suite, immediately before it sends a user here
  // over SSO. Unguarded because the signed route token in the body is the
  // credential — see AuthService.receiveRouteHandoff.
  @Post('receive-route-handoff')
  receiveRouteHandoff(@Body() body: { routeToken: string; ifricdr: string }) {
    return this.authService.receiveRouteHandoff(body);
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
