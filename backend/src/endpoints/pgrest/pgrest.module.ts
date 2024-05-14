
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

import { Module } from '@nestjs/common';
import { PgRestGateway } from './pgrest.gatway';
import { PgRestService } from './pgrest.service';
import { RedisService } from '../redis/redis.service';
import { Server } from 'socket.io'; // Import Server type

@Module({
  providers: [PgRestGateway, PgRestService,RedisService ],
  exports: [PgRestGateway], 
})
export class PgRestGatewayModule {}
