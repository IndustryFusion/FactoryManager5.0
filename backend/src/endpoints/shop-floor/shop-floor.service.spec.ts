import { Test, TestingModule } from '@nestjs/testing';
import { ShopFloorService } from './shop-floor.service';

describe('ShopFloorService', () => {
  let service: ShopFloorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopFloorService],
    }).compile();

    service = module.get<ShopFloorService>(ShopFloorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
