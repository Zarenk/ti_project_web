import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MenuConfigModule } from 'src/menu-config/menu-config.module';
import { ComplaintsService } from './complaints.service';
import { ComplaintsPublicController } from './complaints-public.controller';
import { ComplaintsAdminController } from './complaints-admin.controller';
import { ComplaintsNotificationService } from './complaints-notification.service';
import { ComplaintsDeadlineCron } from './complaints-deadline.cron';

@Module({
  imports: [PrismaModule, MenuConfigModule, ConfigModule],
  controllers: [ComplaintsPublicController, ComplaintsAdminController],
  providers: [
    ComplaintsService,
    ComplaintsNotificationService,
    ComplaintsDeadlineCron,
  ],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
