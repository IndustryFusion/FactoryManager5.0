import { Module } from '@nestjs/common';
import { PgRestGateway } from './pgrest.gatway'; 
import { PgRestService } from './pgrest.service'; 

@Module({
  providers: [PgRestGateway, PgRestService],
  exports: [PgRestGateway] 
})
export class PgRestGatewayModule {}
