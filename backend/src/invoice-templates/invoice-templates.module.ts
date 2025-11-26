import { Module } from '@nestjs/common';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { InvoiceTemplatesController } from './invoice-templates.controller';
import { InvoiceTemplatesMetricsController } from './metrics.controller';
import { InvoiceTemplatesAlertsController } from './alerts.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { InvoiceTemplatesMetricsService } from './metrics.service';
import { InvoiceTemplatesAlertsService } from './alerts.service';
import { InvoiceTemplatesMetricsPublicController } from './metrics-public.controller';
import { InventoryAlertsScheduler } from './alerts.scheduler';

@Module({
  imports: [TenancyModule],
  controllers: [
    InvoiceTemplatesController,
    InvoiceTemplatesMetricsController,
    InvoiceTemplatesAlertsController,
    InvoiceTemplatesMetricsPublicController,
  ],
  providers: [
    InvoiceTemplatesService,
    PrismaService,
    InvoiceTemplatesMetricsService,
    InvoiceTemplatesAlertsService,
    InventoryAlertsScheduler,
  ],
  exports: [
    InvoiceTemplatesService,
    InvoiceTemplatesMetricsService,
    InvoiceTemplatesAlertsService,
  ],
})
export class InvoiceTemplatesModule {}
