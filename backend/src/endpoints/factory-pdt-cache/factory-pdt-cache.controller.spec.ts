import { Test, TestingModule } from '@nestjs/testing';
import { FactoryPdtCacheController } from './factory-pdt-cache.controller';
import { FactoryPdtCacheService } from './factory-pdt-cache.service';

describe('FactoryPdtCacheController', () => {
  let controller: FactoryPdtCacheController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactoryPdtCacheController],
      providers: [FactoryPdtCacheService],
    }).compile();

    controller = module.get<FactoryPdtCacheController>(FactoryPdtCacheController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
