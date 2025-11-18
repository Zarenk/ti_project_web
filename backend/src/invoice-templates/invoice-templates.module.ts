import { Module } from '@nestjs/common';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { InvoiceTemplatesController } from './invoice-templates.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [InvoiceTemplatesController],
  providers: [InvoiceTemplatesService, PrismaService],
  exports: [InvoiceTemplatesService],
})
export class InvoiceTemplatesModule {}
