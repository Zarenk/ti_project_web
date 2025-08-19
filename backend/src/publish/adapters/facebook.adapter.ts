import { Injectable } from '@nestjs/common';
import { PublishAdapter } from '.';

// TODO: Implement real Facebook publishing logic
@Injectable()
export class FacebookAdapter implements PublishAdapter {
  async publish(_image: Buffer, _caption: string): Promise<string> {
    // Placeholder implementation
    return 'facebook-external-id';
  }
}