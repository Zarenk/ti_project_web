import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PublishAdapter } from './adapters';
import { CustomWebhookAdapter } from './adapters/custom-webhook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { TiktokAdapter } from './adapters/tiktok.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { PermanentError, TransientError } from './error';

const MAX_CAPTION = 2200;
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1080;

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private readonly adapters: Record<string, PublishAdapter>;

  constructor(
    customWebhook: CustomWebhookAdapter,
    instagram: InstagramAdapter,
    tiktok: TiktokAdapter,
    facebook: FacebookAdapter,
    private readonly dlq: DeadLetterQueueService,
  ) {
    this.adapters = {
      custom_webhook: customWebhook,
      instagram,
      tiktok,
      facebook,
    };
  }

  private async validate(image: Buffer, caption: string) {
    const meta = await sharp(image).metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
      throw new PermanentError('Unsupported image format');
    }
    if ((meta.width ?? 0) > MAX_WIDTH || (meta.height ?? 0) > MAX_HEIGHT) {
      throw new PermanentError('Invalid image dimensions');
    }
    if (caption.length > MAX_CAPTION) {
      throw new PermanentError('Caption too long');
    }
  }

  async schedulePublish(
    image: Buffer,
    caption: string,
    adapterName: string,
  ): Promise<string | void> {
    await this.validate(image, caption);
    const adapter = this.adapters[adapterName];
    if (!adapter) {
      throw new PermanentError('Adapter not found');
    }
    try {
      return await adapter.publish(image, caption);
    } catch (err) {
      if (err instanceof TransientError) {
        this.logger.warn('Transient error, retrying');
        throw err;
      }
      this.dlq.add({ image, caption, adapterName }, err as Error);
    }
  }
}
