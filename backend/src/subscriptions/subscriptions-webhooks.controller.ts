import { Body, Controller, HttpCode, Post, Logger } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

interface MockWebhookPayload {
  type: string;
  data: {
    sessionId: string;
  };
}

@Controller('subscriptions/webhooks/mock')
export class SubscriptionsWebhooksController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}
  private readonly logger = new Logger(SubscriptionsWebhooksController.name);

  @Post()
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
