import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: true,
})
export class PowerConsumptionGateway {
  @WebSocketServer()
  server: Server;

  sendPowerConsumptionUpdate(data: any) {
    this.server.emit('powerConsumptionUpdate', data);
    console.log(data, "called")
  }
}
