import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

import { WebhookSignatureService } from './webhook-signature.service';
import { WebhookNormalizerService } from './webhook-normalizer.service';
import { PaymentOrchestratorService } from '../payments.service';

/**
 * Public endpoint for receiving payment webhooks from providers.
 * No JWT guard — webhooks are authenticated via signature verification.
 */
@Controller('payments/webhooks')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly signatureService: WebhookSignatureService,
    private readonly normalizerService: WebhookNormalizerService,
    private readonly orchestrator: PaymentOrchestratorService,
  ) {}

  @Post(':provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
  ) {
    this.logger.log(`[webhook] Received from ${provider}`);

    // 1. Verify signature
    this.signatureService.verify(provider, body, headers);

    // 2. Normalize to internal format
    const normalized = this.normalizerService.normalize(provider, body);
    if (!normalized) {
      this.logger.warn(`[webhook] Could not normalize payload from ${provider}`);
      return { received: true, ignored: true };
    }

    // 3. Process
    await this.orchestrator.handleWebhookConfirmed(normalized);

    return { received: true };
  }
}
