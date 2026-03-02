import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { GeminiAdapter } from './providers/gemini.adapter';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublishModule } from '../publish/publish.module';
import { OAuthModule } from './oauth/oauth.module';

@Module({
  imports: [PrismaModule, PublishModule, OAuthModule],
  controllers: [AdsController],
  providers: [AdsService, GeminiAdapter],
  exports: [AdsService],
})
export class AdsModule {}
