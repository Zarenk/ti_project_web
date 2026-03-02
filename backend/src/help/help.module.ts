import { Module } from '@nestjs/common';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';
import { HelpEmbeddingService } from './help-embedding.service';
import { AiProviderManager } from './ai-providers/ai-provider-manager';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [HelpController],
  providers: [HelpService, HelpEmbeddingService, AiProviderManager, PrismaService],
  exports: [HelpEmbeddingService, AiProviderManager],
})
export class HelpModule {}
