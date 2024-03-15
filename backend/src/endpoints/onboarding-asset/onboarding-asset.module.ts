import { Module } from '@nestjs/common';
import { OnboardingAssetService } from './onboarding-asset.service';
import { OnboardingAssetController } from './onboarding-asset.controller';

@Module({
  controllers: [OnboardingAssetController],
  providers: [OnboardingAssetService],
})
export class OnboardingAssetModule {}
