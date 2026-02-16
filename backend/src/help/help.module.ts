import { Module } from '@nestjs/common';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';
import { HelpEmbeddingService } from './help-embedding.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [HelpController],
  providers: [HelpService, HelpEmbeddingService, PrismaService],
})
export class HelpModule {}
