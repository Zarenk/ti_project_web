import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TenancyModule } from '../tenancy/tenancy.module';

import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './webhooks/payment-webhook.controller';
import { PaymentOrchestratorService } from './payments.service';
import { PaymentAdapterRegistry } from './adapters/adapter-registry';
import { CulqiAdapter } from './adapters/culqi.adapter';
import { MercadoPagoAdapter } from './adapters/mercadopago.adapter';
import { ManualAdapter } from './adapters/manual.adapter';
import { WebhookSignatureService } from './webhooks/webhook-signature.service';
import { WebhookNormalizerService } from './webhooks/webhook-normalizer.service';
import { PaymentGateway } from './payment.gateway';
import { PaymentExpirationCron } from './payment-expiration.cron';

@Module({
  imports: [TenancyModule],
  controllers: [PaymentsController, PaymentWebhookController],
  providers: [
    PrismaService,
    PaymentOrchestratorService,
    PaymentAdapterRegistry,
    CulqiAdapter,
    MercadoPagoAdapter,
    ManualAdapter,
    WebhookSignatureService,
    WebhookNormalizerService,
    PaymentGateway,
    PaymentExpirationCron,
  ],
  exports: [PaymentOrchestratorService, PaymentGateway],
})
export class PaymentsModule {}
