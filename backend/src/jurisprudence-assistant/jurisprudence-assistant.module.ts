import { Module } from '@nestjs/common';
import { JurisprudenceAssistantController } from './jurisprudence-assistant.controller';
import { JurisprudenceRagService } from './jurisprudence-rag.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [JurisprudenceAssistantController],
  providers: [JurisprudenceRagService, PrismaService],
  exports: [JurisprudenceRagService],
})
export class JurisprudenceAssistantModule {}
