import { Test, TestingModule } from '@nestjs/testing';
import { PowerConsumptionService } from './power-consumption.service';

describe('PowerConsumptionService', () => {
  let service: PowerConsumptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PowerConsumptionService],
    }).compile();

    service = module.get<PowerConsumptionService>(PowerConsumptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
