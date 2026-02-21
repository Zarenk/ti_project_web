import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryModule } from 'src/inventory/inventory.module';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { SunatModule } from 'src/sunat/sunat.module';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ProfitAnalysisService } from './services/profit-analysis.service';
import { PredictiveAlgorithmService } from './services/predictive-algorithm.service';
import { InvestmentRecommendationService } from './services/investment-recommendation.service';

@Module({
  imports: [InventoryModule, ActivityModule, SunatModule, TenancyModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    PrismaService,
    AccountingHook,
    SubscriptionQuotaService,
    ProfitAnalysisService,
    PredictiveAlgorithmService,
    InvestmentRecommendationService,
  ],
})
export class SalesModule {}
