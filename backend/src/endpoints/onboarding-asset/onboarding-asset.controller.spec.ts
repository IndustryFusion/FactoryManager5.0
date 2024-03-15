import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingAssetController } from './onboarding-asset.controller';
import { OnboardingAssetService } from './onboarding-asset.service';

describe('OnboardingAssetController', () => {
  let controller: OnboardingAssetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingAssetController],
      providers: [OnboardingAssetService],
    }).compile();

    controller = module.get<OnboardingAssetController>(OnboardingAssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
