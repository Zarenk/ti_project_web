import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryModule } from 'src/category/category.module'; // Importa el módulo de categorías
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [CategoryModule, ActivityModule, TenancyModule], // Asegúrate de importar el módulo de categorías
  controllers: [EntriesController],
  providers: [EntriesService, PrismaService, AccountingHook, AccountingService],
})
export class EntriesModule {}
