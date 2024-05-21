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

import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Req, Res, Session, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { TokenService } from '../session/token.service';
import { CronService } from './cron.service';

@Controller('cron')
export class CronController {
    constructor(
        private readonly cronService: CronService,
        private readonly tokenService: TokenService
    ) {}

    @Get()
    async validate(@Req() req: Request) {
        try {
            const token = await this.tokenService.getToken();
            return this.cronService.validateScript(token);
        } catch (err) {
            throw new NotFoundException("Error fetching assets " + err);
        }
    }
    
}