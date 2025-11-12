import { Module } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { SunatController } from './sunat.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [SunatController],
  providers: [SunatService, PrismaService],
  exports: [SunatService],
})
export class SunatModule {}
