import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PublishService } from './publish.service';
import { CustomWebhookAdapter } from './adapters/custom-webhook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { TiktokAdapter } from './adapters/tiktok.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { PublishLogService } from './publish-log.service';

@Module({
  imports: [HttpModule],
  providers: [
    PublishService,
    CustomWebhookAdapter,
    InstagramAdapter,
    TiktokAdapter,
    FacebookAdapter,
    DeadLetterQueueService,
    PublishLogService,
  ],
  exports: [PublishService],
})
export class PublishModule {}
