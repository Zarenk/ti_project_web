import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicSignupController } from './public-signup.controller';
import { PublicSignupService } from './public-signup.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, SubscriptionsModule],
  controllers: [PublicSignupController],
  providers: [PublicSignupService, PrismaService],
})
export class PublicSignupModule {}
