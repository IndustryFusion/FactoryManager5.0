import { Test, TestingModule } from '@nestjs/testing';
import { FactorySiteService } from './factory-site.service';

describe('FactorySiteService', () => {
  let service: FactorySiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FactorySiteService],
    }).compile();

    service = module.get<FactorySiteService>(FactorySiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
