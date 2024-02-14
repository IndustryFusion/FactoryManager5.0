import { Test, TestingModule } from '@nestjs/testing';
import { ShopFloorAssetsService } from './shop-floor-assets.service';

describe('ShopFloorAssetsService', () => {
  let service: ShopFloorAssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopFloorAssetsService],
    }).compile();

    service = module.get<ShopFloorAssetsService>(ShopFloorAssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
