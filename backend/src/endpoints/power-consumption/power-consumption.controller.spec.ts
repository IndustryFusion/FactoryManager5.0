import { Test, TestingModule } from '@nestjs/testing';
import { PowerConsumptionController } from './power-consumption.controller';
import { PowerConsumptionService } from './power-consumption.service';

describe('PowerConsumptionController', () => {
  let controller: PowerConsumptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PowerConsumptionController],
      providers: [PowerConsumptionService],
    }).compile();

    controller = module.get<PowerConsumptionController>(PowerConsumptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
