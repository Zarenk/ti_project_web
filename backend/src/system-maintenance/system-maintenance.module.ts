import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMaintenanceController } from './system-maintenance.controller';
import { SystemMaintenanceService } from './system-maintenance.service';

@Module({
  imports: [ConfigModule],
  controllers: [SystemMaintenanceController],
  providers: [SystemMaintenanceService, PrismaService],
})
export class SystemMaintenanceModule {}