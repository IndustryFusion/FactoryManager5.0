import { Test, TestingModule } from '@nestjs/testing';
import { PgRestService } from './pgrest.service';

describe('PgRestService', () => {
  let service: PgRestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PgRestService],
    }).compile();

    service = module.get<PgRestService>(PgRestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
