import { Test, TestingModule } from '@nestjs/testing';
import { ReactFlowService } from './react-flow.service';

describe('ReactFlowService', () => {
  let service: ReactFlowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReactFlowService],
    }).compile();

    service = module.get<ReactFlowService>(ReactFlowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
