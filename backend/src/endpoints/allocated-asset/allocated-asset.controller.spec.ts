import { Test, TestingModule } from '@nestjs/testing';
import { AllocatedAssetController } from './allocated-asset.controller';
import { AllocatedAssetService } from './allocated-asset.service';

describe('AllocatedAssetController', () => {
  let controller: AllocatedAssetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllocatedAssetController],
      providers: [AllocatedAssetService],
    }).compile();

    controller = module.get<AllocatedAssetController>(AllocatedAssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
