import { Global, Module } from '@nestjs/common';
import { RealtimePresenceService } from './realtime-presence.service';

/**
 * Global so that every consumer shares ONE presence instance.
 *
 * PgRestGateway is provided by both PgRestGatewayModule and AppModule, so it is
 * instantiated more than once. Presence must not be — if each gateway got its
 * own counter, the connect/disconnect events would be split across instances and
 * the realtime jobs would never start or stop correctly.
 */
@Global()
@Module({
  providers: [RealtimePresenceService],
  exports: [RealtimePresenceService],
})
export class RealtimeModule {}
