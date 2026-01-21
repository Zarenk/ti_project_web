import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [ActivityModule, TenancyModule],
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService],
})
export class BrandsModule {}
