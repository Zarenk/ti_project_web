import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
