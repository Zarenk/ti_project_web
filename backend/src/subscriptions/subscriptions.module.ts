import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionsWebhooksController } from './subscriptions-webhooks.controller';
import { MockPaymentProvider } from './payment-providers/mock-payment.provider';
import { PAYMENT_PROVIDER_TOKEN } from './subscriptions.tokens';
import { TrialCronService } from './trial-cron.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';

@Module({
  controllers: [SubscriptionsController, SubscriptionsWebhooksController],
  providers: [
    SubscriptionsService,
    PrismaService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: MockPaymentProvider,
    },
    TrialCronService,
    SubscriptionNotificationsService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
