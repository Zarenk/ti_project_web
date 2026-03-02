import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';

@Module({
  imports: [TenancyModule, PrismaModule],
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentsService, PrismaService],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
