import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/camera',  // must match PUSH_NAMESPACE (default: /camera)
  cors: { origin: '*' }, // restrict in production
})
export class CameraGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** Latest JPEG frame per device+camera, keyed as "deviceId:cameraIndex" */
  private readonly frames = new Map<string, Buffer>();

  /** Known cameras per connected device, keyed as deviceId → Set of cameraIndex */
  private readonly deviceCameras = new Map<string, Set<number>>();

  // ── Incoming connection from edge gateway ──────────────────────────────────

  handleConnection(client: Socket) {
    const { deviceId, secret } = client.handshake.auth as {
      deviceId?: string;
      secret?: string;
    };

    // Only edge-gateway connections supply a deviceId.
    // Browser consumers connect without auth — let them through.
    if (!deviceId) {
      return; // consumer client — authentication not required
    }

    // Validate shared secret for gateway connections
    const expected = process.env.CAMERA_PUSH_SECRET ?? '';
    if (expected && secret !== expected) {
      client.disconnect(true);
      return;
    }

    client.data.deviceId = deviceId;

    // Register device immediately so it appears in the REST list before any frame
    if (!this.deviceCameras.has(deviceId)) {
      this.deviceCameras.set(deviceId, new Set());
    }

    console.log(`[CameraGateway] gateway connected: ${deviceId}`);
  }

  handleDisconnect(client: Socket) {
    console.log(
      `[CameraGateway] gateway disconnected: ${client.data.deviceId}`,
    );
  }

  // ── Receive pushed frame from edge gateway ─────────────────────────────────

  @SubscribeMessage('camera:frame')
  handleFrame(
    @MessageBody()
    data: {
      deviceId: string;    // gateway DEVICE_ID
      cameraIndex: number; // /dev/videoN index
      timestamp: number;   // Unix epoch (seconds, float)
      jpeg: Buffer;        // raw JPEG bytes
    },
    @ConnectedSocket() _client: Socket,
  ) {
    const key = `${data.deviceId}:${data.cameraIndex}`;
    this.frames.set(key, data.jpeg);

    // Track this camera index for the device
    if (!this.deviceCameras.has(data.deviceId)) {
      this.deviceCameras.set(data.deviceId, new Set());
    }
    this.deviceCameras.get(data.deviceId)!.add(data.cameraIndex);

    // Broadcast the latest frame to all consumers subscribed to this room
    this.server.to(key).emit('camera:frame', {
      deviceId: data.deviceId,
      cameraIndex: data.cameraIndex,
      timestamp: data.timestamp,
      jpeg: data.jpeg,
    });
  }

  // ── Consumer subscription (browser / app joins a room) ─────────────────────

  @SubscribeMessage('camera:subscribe')
  handleSubscribe(
    @MessageBody() data: { deviceId: string; cameraIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    const key = `${data.deviceId}:${data.cameraIndex}`;
    client.join(key);

    // Immediately deliver the buffered frame so the consumer doesn't have to
    // wait until the next push cycle
    const latest = this.frames.get(key);
    if (latest) {
      client.emit('camera:frame', {
        deviceId: data.deviceId,
        cameraIndex: data.cameraIndex,
        timestamp: Date.now() / 1000,
        jpeg: latest,
      });
    }
  }

  @SubscribeMessage('camera:unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { deviceId: string; cameraIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`${data.deviceId}:${data.cameraIndex}`);
  }

  // ── REST helper — list every known device+camera stream ──────────────────────
  getKnownStreams(): Array<{ deviceId: string; cameraIndex: number }> {
    const result: Array<{ deviceId: string; cameraIndex: number }> = [];
    for (const [deviceId, cameras] of this.deviceCameras) {
      if (cameras.size === 0) {
        // Device connected but no frame yet — expose it with a placeholder index
        result.push({ deviceId, cameraIndex: 0 });
      } else {
        for (const cameraIndex of cameras) {
          result.push({ deviceId, cameraIndex });
        }
      }
    }
    return result;
  }
}
