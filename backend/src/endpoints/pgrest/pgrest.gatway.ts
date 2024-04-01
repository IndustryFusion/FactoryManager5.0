import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class PgRestGateway {
  @WebSocketServer()
  server: Server;

  sendUpdate(data: any) {
    this.server.emit('dataUpdate', data);
  }
}
