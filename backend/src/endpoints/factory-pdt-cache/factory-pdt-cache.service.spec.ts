import { Test, TestingModule } from '@nestjs/testing';
import { FactoryPdtCacheService } from './factory-pdt-cache.service';

describe('FactoryPdtCacheService', () => {
  let service: FactoryPdtCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FactoryPdtCacheService],
    }).compile();

    service = module.get<FactoryPdtCacheService>(FactoryPdtCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
