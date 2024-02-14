import { Test, TestingModule } from '@nestjs/testing';
import { NonShopFloorAssetsService } from './non-shop-floor-assets.service';

describe('NonShopFloorAssetsService', () => {
  let service: NonShopFloorAssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NonShopFloorAssetsService],
    }).compile();

    service = module.get<NonShopFloorAssetsService>(NonShopFloorAssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
