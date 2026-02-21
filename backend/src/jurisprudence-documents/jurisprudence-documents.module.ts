import { Module } from '@nestjs/common';
import { JurisprudenceDocumentsController } from './jurisprudence-documents.controller';
import { JurisprudenceEmbeddingService } from './jurisprudence-embedding.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [JurisprudenceDocumentsController],
  providers: [JurisprudenceEmbeddingService, PrismaService],
  exports: [JurisprudenceEmbeddingService],
})
export class JurisprudenceDocumentsModule {}
