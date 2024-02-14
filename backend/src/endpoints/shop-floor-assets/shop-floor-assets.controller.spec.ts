import { Test, TestingModule } from '@nestjs/testing';
import { ShopFloorAssetsController } from './shop-floor-assets.controller';
import { ShopFloorAssetsService } from './shop-floor-assets.service';

describe('ShopFloorAssetsController', () => {
  let controller: ShopFloorAssetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopFloorAssetsController],
      providers: [ShopFloorAssetsService],
    }).compile();

    controller = module.get<ShopFloorAssetsController>(ShopFloorAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
