import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [StoresController],
  providers: [StoresService, PrismaService],
})
export class StoresModule {}
