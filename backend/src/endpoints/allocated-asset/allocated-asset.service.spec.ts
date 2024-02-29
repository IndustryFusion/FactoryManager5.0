import { Test, TestingModule } from '@nestjs/testing';
import { AllocatedAssetService } from './allocated-asset.service';

describe('AllocatedAssetService', () => {
  let service: AllocatedAssetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllocatedAssetService],
    }).compile();

    service = module.get<AllocatedAssetService>(AllocatedAssetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
