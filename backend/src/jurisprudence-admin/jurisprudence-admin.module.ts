import { Module } from '@nestjs/common';
import { JurisprudenceAdminController } from './jurisprudence-admin.controller';
import { JurisprudenceAdminService } from './jurisprudence-admin.service';
import { JurisprudenceCoverageService } from './jurisprudence-coverage.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [JurisprudenceAdminController],
  providers: [JurisprudenceAdminService, JurisprudenceCoverageService, PrismaService],
  exports: [JurisprudenceAdminService, JurisprudenceCoverageService],
})
export class JurisprudenceAdminModule {}
