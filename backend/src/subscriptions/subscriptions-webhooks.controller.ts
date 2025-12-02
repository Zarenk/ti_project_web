import { Body, Controller, HttpCode, Post, Logger, Headers } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

interface MockWebhookPayload {
  type: string;
  data: {
    sessionId: string;
  };
}

@Controller('subscriptions/webhooks')
export class SubscriptionsWebhooksController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}
  private readonly logger = new Logger(SubscriptionsWebhooksController.name);

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: PaymentWebhookDto,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.debug(
      `Received webhook ${payload.provider ?? 'unknown'}:${payload.type}`,
    );
    return this.subscriptionsService.handleWebhookEvent(payload, headers);
  }

  @Post('mock')
  @HttpCode(200)
  async handleMockEvent(@Body() payload: MockWebhookPayload) {
    this.logger.debug(`Received mock webhook ${payload.type}`);
    if (payload.type === 'checkout.session.completed') {
      return this.subscriptionsService.finalizeCheckoutSession(
        payload.data.sessionId,
      );
    }

    return { received: true, ignored: true };
  }
}
