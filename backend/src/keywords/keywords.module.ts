import { Module } from '@nestjs/common';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [KeywordsController],
  providers: [KeywordsService, PrismaService],
})
export class KeywordsModule {}