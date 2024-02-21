import { Test, TestingModule } from '@nestjs/testing';
import { ReactFlowController } from './react-flow.controller';
import { ReactFlowService } from './react-flow.service';

describe('ReactFlowController', () => {
  let controller: ReactFlowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReactFlowController],
      providers: [ReactFlowService],
    }).compile();

    controller = module.get<ReactFlowController>(ReactFlowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
