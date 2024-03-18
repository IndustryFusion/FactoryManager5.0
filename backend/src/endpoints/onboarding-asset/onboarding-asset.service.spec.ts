import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingAssetService } from './onboarding-asset.service';

describe('OnboardingAssetService', () => {
  let service: OnboardingAssetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingAssetService],
    }).compile();

    service = module.get<OnboardingAssetService>(OnboardingAssetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
