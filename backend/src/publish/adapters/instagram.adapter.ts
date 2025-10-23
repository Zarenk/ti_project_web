import { Injectable } from '@nestjs/common';
import { PublishAdapter } from './index';

// TODO: Implement real Instagram publishing logic
@Injectable()
export class InstagramAdapter implements PublishAdapter {
  async publish(_image: Buffer, _caption: string): Promise<string> {
    // Placeholder implementation
    return 'instagram-external-id';
  }
}
