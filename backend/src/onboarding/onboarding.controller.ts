import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingStepDto } from './dto/update-onboarding-step.dto';
import { UpdateDemoStatusDto } from './dto/update-demo-status.dto';
import { ClearDemoDataDto } from './dto/clear-demo-data.dto';
import { SeedDemoDataDto } from './dto/seed-demo-data.dto';

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  async getProgress() {
    return this.onboardingService.getProgressForCurrentTenant();
  }

  @Patch('step')
  async updateStep(@Body() dto: UpdateOnboardingStepDto) {
    return this.onboardingService.updateStep(dto);
  }

  @Post('demo/status')
  async updateDemoStatus(@Body() dto: UpdateDemoStatusDto) {
    return this.onboardingService.updateDemoStatus(dto);
  }

  @Post('demo/clear')
  async clearDemoData(@Body() dto: ClearDemoDataDto) {
    return this.onboardingService.clearDemoData(dto.reason);
  }

  @Post('banner/dismiss')
  async dismissBanner() {
    return this.onboardingService.dismissWizardBanner();
  }

  @Post('demo/seed')
  async seedDemoData(@Body() dto: SeedDemoDataDto) {
    return this.onboardingService.seedDemoData(dto.industry);
  }
}
