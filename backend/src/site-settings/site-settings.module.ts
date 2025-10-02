import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SiteSettingsController } from './site-settings.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolesGuard } from 'src/users/roles.guard';

@Module({
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService, PrismaService, RolesGuard],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}