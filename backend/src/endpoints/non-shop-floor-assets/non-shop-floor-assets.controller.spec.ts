import { Test, TestingModule } from '@nestjs/testing';
import { NonShopFloorAssetsController } from './non-shop-floor-assets.controller';
import { NonShopFloorAssetsService } from './non-shop-floor-assets.service';

describe('NonShopFloorAssetsController', () => {
  let controller: NonShopFloorAssetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NonShopFloorAssetsController],
      providers: [NonShopFloorAssetsService],
    }).compile();

    controller = module.get<NonShopFloorAssetsController>(NonShopFloorAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
