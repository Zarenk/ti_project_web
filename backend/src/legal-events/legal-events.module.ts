import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { LegalEventsController } from './legal-events.controller';
import { LegalEventsService } from './legal-events.service';
import { LegalReminderCron } from './legal-reminder.cron';

@Module({
  imports: [TenancyModule, PrismaModule, ConfigModule],
  controllers: [LegalEventsController],
  providers: [LegalEventsService, LegalReminderCron, PrismaService],
  exports: [LegalEventsService],
})
export class LegalEventsModule {}
