import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

/**
 * Custom Socket.IO v4 adapter.
 *
 * Centralises server-level options (CORS, transports, EIO3 compat) here
 * rather than spreading them across every @WebSocketGateway decorator.
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const corsOrigins = process.env.CORS_ORIGIN?.split(',') ?? ['*'];

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true, // Engine.IO v3 compat (python-socketio clients)
    } satisfies ServerOptions);
  }
}
