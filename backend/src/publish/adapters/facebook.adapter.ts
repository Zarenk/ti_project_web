import { Injectable, Logger } from '@nestjs/common';
import { PublishAdapter, PublishConfig } from '.';
import { PermanentError } from '../error';

@Injectable()
export class FacebookAdapter implements PublishAdapter {
  private readonly logger = new Logger(FacebookAdapter.name);

  async publish(
    image: Buffer,
    caption: string,
    config?: PublishConfig,
  ): Promise<string> {
    if (!config?.accessToken || !config?.accountId) {
      throw new PermanentError(
        'Facebook publish requires accessToken and accountId (page_id)',
      );
    }

    const pageId = config.accountId;
    const token = config.accessToken;

    // POST /{page-id}/photos — multipart form with image buffer
    const form = new FormData();
    form.append('source', new Blob([new Uint8Array(image)]), 'ad.jpg');
    form.append('message', caption);
    form.append('access_token', token);

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      { method: 'POST', body: form },
    );

    const data = await res.json();

    if (data.error) {
      this.logger.error(`Facebook API error: ${data.error.message}`);
      throw new PermanentError(`Facebook: ${data.error.message}`);
    }

    const postId = data.post_id || data.id;
    this.logger.log(`Published to Facebook page ${pageId}: ${postId}`);
    return postId;
  }
}
