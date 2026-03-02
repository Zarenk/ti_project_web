import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { GymMemberService } from './gym-member.service';
import { GymMemberController } from './gym-member.controller';
import { GymMembershipService } from './gym-membership.service';
import { GymMembershipController } from './gym-membership.controller';
import { GymCheckinService } from './gym-checkin.service';
import { GymCheckinController } from './gym-checkin.controller';
import { GymTrainerService } from './gym-trainer.service';
import { GymTrainerController } from './gym-trainer.controller';
import { GymClassService } from './gym-class.service';
import { GymClassController, GymScheduleController, GymBookingController } from './gym-class.controller';
import { GymCronService } from './gym-cron.service';
import { GymAnalyticsService } from './gym-analytics.service';
import { GymAnalyticsController } from './gym-analytics.controller';

@Module({
  imports: [ActivityModule],
  controllers: [
    GymMemberController,
    GymMembershipController,
    GymCheckinController,
    GymTrainerController,
    GymClassController,
    GymScheduleController,
    GymBookingController,
    GymAnalyticsController,
  ],
  providers: [
    PrismaService,
    GymMemberService,
    GymMembershipService,
    GymCheckinService,
    GymTrainerService,
    GymClassService,
    GymCronService,
    GymAnalyticsService,
  ],
  exports: [
    GymMemberService,
    GymMembershipService,
    GymCheckinService,
    GymTrainerService,
    GymClassService,
  ],
})
export class GymModule {}
