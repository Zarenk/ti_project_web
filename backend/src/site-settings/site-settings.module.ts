import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SiteSettingsController } from './site-settings.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [TenancyModule, ActivityModule],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService, PrismaService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
