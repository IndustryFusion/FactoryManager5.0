import { Test, TestingModule } from '@nestjs/testing';
import { ValueChangeStateController } from './value-change-state.controller';
import { ValueChangeStateService } from './value-change-state.service';

describe('ValueChangeStateController', () => {
  let controller: ValueChangeStateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValueChangeStateController],
      providers: [ValueChangeStateService],
    }).compile();

    controller = module.get<ValueChangeStateController>(ValueChangeStateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
