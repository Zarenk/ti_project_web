import { Module } from '@nestjs/common';
import { AccReportsService } from './acc-reports.service';
import { AccReportsController } from './acc-reports.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AccReportsController],
  providers: [AccReportsService, PrismaService],
})
export class AccReportsModule {}