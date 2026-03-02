import { Module } from '@nestjs/common';
import { JurisprudenceDocumentsController } from './jurisprudence-documents.controller';
import { JurisprudenceEmbeddingService } from './jurisprudence-embedding.service';
import { JurisprudenceTextExtractorService } from './jurisprudence-text-extractor.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [JurisprudenceDocumentsController],
  providers: [JurisprudenceEmbeddingService, JurisprudenceTextExtractorService, PrismaService],
  exports: [JurisprudenceEmbeddingService, JurisprudenceTextExtractorService],
})
export class JurisprudenceDocumentsModule {}
