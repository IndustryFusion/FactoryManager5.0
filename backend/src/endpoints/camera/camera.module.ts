import { Module } from '@nestjs/common';
import { CameraGateway } from './camera.gateway';
import { CameraController } from './camera.controller';

@Module({
  controllers: [CameraController],
  providers: [CameraGateway],
})
export class CameraModule {}
