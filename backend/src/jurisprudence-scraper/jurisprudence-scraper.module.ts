import { Module } from '@nestjs/common';
import { JurisprudenceScraperController } from './jurisprudence-scraper.controller';
import { JurisprudenceScraperService } from './jurisprudence-scraper.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [JurisprudenceScraperController],
  providers: [JurisprudenceScraperService, PrismaService],
  exports: [JurisprudenceScraperService],
})
export class JurisprudenceScraperModule {}
