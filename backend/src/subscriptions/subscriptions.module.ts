import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionsWebhooksController } from './subscriptions-webhooks.controller';
import { MockPaymentProvider } from './payment-providers/mock-payment.provider';
import { PAYMENT_PROVIDER_TOKEN } from './subscriptions.tokens';
import { TrialCronService } from './trial-cron.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { MercadoPagoPaymentProvider } from './payment-providers/mercado-pago.provider';
import { ConfigService } from '@nestjs/config';
import { SubscriptionQuotaService } from './subscription-quota.service';
import { SubscriptionQuotaController } from './subscription-quota.controller';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { SunatModule } from 'src/sunat/sunat.module';
import { TaxRateService } from './tax-rate.service';
import { ActivityModule } from 'src/activity/activity.module';
import { DunningCronService } from './dunning-cron.service';
import { OrganizationExportService } from './organization-export.service';
import { OrganizationExportCronService } from './organization-export.cron';

@Module({
  imports: [TenancyModule, SunatModule, ActivityModule],
  controllers: [
    SubscriptionsController,
    SubscriptionsWebhooksController,
    SubscriptionQuotaController,
  ],
  providers: [
    SubscriptionsService,
    PrismaService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const accessToken = configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
        if (accessToken) {
          return new MercadoPagoPaymentProvider(accessToken);
        }
        return new MockPaymentProvider();
      },
      inject: [ConfigService],
    },
    TrialCronService,
    SubscriptionNotificationsService,
    DunningCronService,
    SubscriptionQuotaService,
    TaxRateService,
    OrganizationExportService,
    OrganizationExportCronService,
  ],
  exports: [SubscriptionsService, SubscriptionNotificationsService],
})
export class SubscriptionsModule {}
