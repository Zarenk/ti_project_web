import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import sharp from 'sharp';
import { PublishAdapter } from '.';
import { TransientError, PermanentError } from '../error';
import { PublishLogService } from '../publish-log.service';

@Injectable()
export class CustomWebhookAdapter implements PublishAdapter {
  constructor(
    private readonly http: HttpService,
    private readonly logService: PublishLogService,
  ) {}

  async publish(image: Buffer, caption: string): Promise<string> {
    try {
      const sanitized = await sharp(image).jpeg().toBuffer();
      const uploadUrl = process.env.CUSTOM_WEBHOOK_UPLOAD_URL as string;
      const callbackUrl = process.env.CUSTOM_WEBHOOK_CALLBACK_URL as string;
      await this.http.axiosRef.put(uploadUrl, sanitized, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
      const res = await this.http.axiosRef.post(callbackUrl, { caption });
      const externalId = res.data?.externalId ?? res.data?.id ?? '';
      const truncated = JSON.stringify(res.data).slice(0, 1000);
      this.logService.create({ externalId, response: truncated });
      return externalId;
    } catch (err: any) {
      if (err.response?.status && err.response.status >= 500) {
        throw new TransientError('Webhook transient failure');
      }
      throw new PermanentError('Webhook permanent failure');
    }
  }
}
