import { Injectable } from '@nestjs/common';
import { PublishAdapter } from './index';

// TODO: Implement real TikTok publishing logic
@Injectable()
export class TiktokAdapter implements PublishAdapter {
  async publish(_image: Buffer, _caption: string): Promise<string> {
    // Placeholder implementation
    return 'tiktok-external-id';
  }
}