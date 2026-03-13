import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicSignupController } from './public-signup.controller';
import { PublicSignupService } from './public-signup.service';
import { AdminSignupsController } from './admin-signups.controller';
import { AdminSignupsService } from './admin-signups.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, SubscriptionsModule],
  controllers: [PublicSignupController, AdminSignupsController, AdminDashboardController],
  providers: [PublicSignupService, AdminSignupsService, AdminDashboardService, PrismaService],
})
export class PublicSignupModule {}
