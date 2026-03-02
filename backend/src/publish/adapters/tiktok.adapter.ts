import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PublishAdapter, PublishConfig } from './index';
import { PermanentError } from '../error';

@Injectable()
export class TiktokAdapter implements PublishAdapter {
  private readonly logger = new Logger(TiktokAdapter.name);

  async publish(
    image: Buffer,
    caption: string,
    config?: PublishConfig,
  ): Promise<string> {
    if (!config?.accessToken) {
      throw new PermanentError('TikTok publish requires accessToken');
    }

    const token = config.accessToken;

    // TikTok requires a public URL for photo posts
    const imageUrl = await this.uploadTemp(image);

    // TikTok Content Posting API v2 — Photo post
    const res = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/content/init/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: caption.slice(0, 150),
            privacy_level: 'SELF_ONLY',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            photo_images: [imageUrl],
          },
          post_mode: 'DIRECT_POST',
          media_type: 'PHOTO',
        }),
      },
    );

    const data = await res.json();

    if (data.error?.code && data.error.code !== 'ok') {
      this.logger.error(
        `TikTok API error: ${data.error.message || JSON.stringify(data.error)}`,
      );
      throw new PermanentError(
        `TikTok: ${data.error.message || 'Unknown error'}`,
      );
    }

    const publishId = data.data?.publish_id || 'tiktok-pending';
    this.logger.log(`Published to TikTok: ${publishId}`);
    return publishId;
  }

  private async uploadTemp(image: Buffer): Promise<string> {
    const dir = path.join(process.cwd(), 'uploads', 'ads', 'temp');
    fs.mkdirSync(dir, { recursive: true });

    const filename = `tt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    fs.writeFileSync(path.join(dir, filename), image);

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    return `${baseUrl}/uploads/ads/temp/${filename}`;
  }
}
