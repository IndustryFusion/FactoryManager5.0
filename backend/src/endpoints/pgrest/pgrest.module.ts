
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
