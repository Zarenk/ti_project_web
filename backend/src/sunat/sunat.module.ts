import { Module } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { SunatController } from './sunat.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SunatController],
  providers: [SunatService, PrismaService],
})
export class SunatModule {}
