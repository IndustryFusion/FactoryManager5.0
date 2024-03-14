import { Test, TestingModule } from '@nestjs/testing';
import { ValueChangeStateService } from './value-change-state.service';

describe('ValueChangeStateService', () => {
  let service: ValueChangeStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValueChangeStateService],
    }).compile();

    service = module.get<ValueChangeStateService>(ValueChangeStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
