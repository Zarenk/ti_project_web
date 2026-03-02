import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { LegalMattersController } from './legal-matters.controller';
import { LegalMattersService } from './legal-matters.service';

@Module({
  imports: [TenancyModule, PrismaModule],
  controllers: [LegalMattersController],
  providers: [LegalMattersService, PrismaService],
  exports: [LegalMattersService],
})
export class LegalMattersModule {}
