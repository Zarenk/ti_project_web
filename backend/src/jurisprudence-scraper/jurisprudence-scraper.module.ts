import { Module } from '@nestjs/common';
import { JurisprudenceScraperController } from './jurisprudence-scraper.controller';
import { JurisprudenceScraperService } from './jurisprudence-scraper.service';
import { PrismaService } from '../prisma/prisma.service';
import { JurisprudenceDocumentsModule } from '../jurisprudence-documents/jurisprudence-documents.module';

@Module({
  imports: [JurisprudenceDocumentsModule],
  controllers: [JurisprudenceScraperController],
  providers: [JurisprudenceScraperService, PrismaService],
  exports: [JurisprudenceScraperService],
})
export class JurisprudenceScraperModule {}
