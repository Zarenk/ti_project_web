import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PublishAdapter, PublishConfig } from '.';
import { PermanentError, TransientError } from '../error';

const CONTAINER_POLL_INTERVAL = 2000;
const CONTAINER_POLL_MAX = 15; // 30 seconds max

@Injectable()
export class InstagramAdapter implements PublishAdapter {
  private readonly logger = new Logger(InstagramAdapter.name);

  async publish(
    image: Buffer,
    caption: string,
    config?: PublishConfig,
  ): Promise<string> {
    if (!config?.accessToken || !config?.accountId) {
      throw new PermanentError(
        'Instagram publish requires accessToken and accountId (ig_user_id)',
      );
    }

    const igUserId = config.accountId;
    const token = config.accessToken;

    // Instagram requires a publicly accessible image URL
    const imageUrl = await this.uploadTemp(image);

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: token,
        }),
      },
    );

    const containerData = await containerRes.json();

    if (containerData.error) {
      this.logger.error(`IG container error: ${containerData.error.message}`);
      throw new PermanentError(`Instagram: ${containerData.error.message}`);
    }

    const containerId = containerData.id;
    this.logger.log(`Created IG container: ${containerId}`);

    // Step 2: Wait for container to finish processing
    await this.waitForContainer(containerId, token);

    // Step 3: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token,
        }),
      },
    );

    const publishData = await publishRes.json();

    if (publishData.error) {
      this.logger.error(`IG publish error: ${publishData.error.message}`);
      throw new PermanentError(`Instagram: ${publishData.error.message}`);
    }

    const mediaId = publishData.id;
    this.logger.log(`Published to Instagram: ${mediaId}`);
    return mediaId;
  }

  /**
   * Poll container status until FINISHED or timeout.
   */
  private async waitForContainer(
    containerId: string,
    token: string,
  ): Promise<void> {
    for (let i = 0; i < CONTAINER_POLL_MAX; i++) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`,
      );
      const data = await res.json();

      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new PermanentError(
          `Instagram container processing failed: ${data.status_code}`,
        );
      }

      // IN_PROGRESS — wait and retry
      await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL));
    }

    throw new TransientError('Instagram container processing timed out');
  }

  /**
   * Save image buffer to a temp file and return its public URL.
   * The backend must serve /uploads/ statically for this to work.
   */
  private async uploadTemp(image: Buffer): Promise<string> {
    const dir = path.join(process.cwd(), 'uploads', 'ads', 'temp');
    fs.mkdirSync(dir, { recursive: true });

    const filename = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    fs.writeFileSync(path.join(dir, filename), image);

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    return `${baseUrl}/uploads/ads/temp/${filename}`;
  }
}
