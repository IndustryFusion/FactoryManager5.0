import { Controller, Get } from '@nestjs/common';
import { CameraGateway } from './camera.gateway';

@Controller('cameras')
export class CameraController {
  constructor(private readonly gateway: CameraGateway) {}

  /** Returns every device+camera stream that has pushed at least one frame. */
  @Get('devices')
  getDevices() {
    return { streams: this.gateway.getKnownStreams() };
  }
}
