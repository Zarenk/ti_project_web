import { Injectable } from '@nestjs/common';

/**
 * Stub antivirus scanner. In production this could call out to an external
 * scanner. For development it simply resolves without action.
 */
@Injectable()
export class AntivirusService {
  async scan(_buffer: Buffer): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      return; // no-op in development
    }
    // Placeholder for real AV scan integration
    return;
  }
}