import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { OnboardingDemoDataService } from './onboarding-demo-data.service';

@Module({
  imports: [TenancyModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingDemoDataService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
