import { Test, TestingModule } from '@nestjs/testing';
import { WorkCenterService } from './work-center.service';

describe('WorkFloorService', () => {
  let service: WorkCenterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkCenterService],
    }).compile();

    service = module.get<WorkCenterService>(WorkCenterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
