import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SunatModule } from 'src/sunat/sunat.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { SalesModule } from 'src/sales/sales.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';

@Module({
  imports: [TenancyModule, SunatModule, SalesModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService, PrismaService, AccountingHook],
  exports: [CreditNotesService],
})
export class CreditNotesModule {}
