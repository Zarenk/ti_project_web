import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, PrismaService],
})
export class ProvidersModule {}
