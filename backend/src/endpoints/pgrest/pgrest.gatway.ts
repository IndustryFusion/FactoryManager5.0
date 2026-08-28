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

import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { RealtimePresenceService } from '../realtime/realtime-presence.service';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: "*", // Allow all origins (modify for security)
    credentials: true,
  },
  transports: ["websocket"]
})
@Injectable()
export class PgRestGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly presence: RealtimePresenceService) {}

  // Presence drives whether the realtime cron jobs exist at all.
  handleConnection(client: Socket) {
    this.presence.addClient(client.id);
  }

  handleDisconnect(client: Socket) {
    this.presence.removeClient(client.id);
  }

  sendUpdate(data: any) {
    this.server.emit('dataUpdate', data);
  }
}
