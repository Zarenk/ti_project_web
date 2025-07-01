import { Module } from '@nestjs/common';
import { GuideService } from './guide.service';
import { GuideController } from './guide.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirmadorJavaService } from './firmador-java.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [GuideController],
  providers: [GuideService, FirmadorJavaService, PrismaService],
})
export class GuideModule {}
