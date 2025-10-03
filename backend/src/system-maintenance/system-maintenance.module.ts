import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SiteSettingsModule } from 'src/site-settings/site-settings.module';
import { SystemMaintenanceController } from './system-maintenance.controller';
import { SystemMaintenanceService } from './system-maintenance.service';

@Module({
  imports: [ConfigModule, SiteSettingsModule],
  controllers: [SystemMaintenanceController],
  providers: [SystemMaintenanceService, PrismaService],
})
export class SystemMaintenanceModule {}
