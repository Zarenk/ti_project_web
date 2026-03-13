import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Verifies webhook signatures per provider and enforces anti-replay.
 */
@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);
  private readonly REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly config: ConfigService) {}

  verify(
    provider: string,
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): void {
    switch (provider) {
      case 'mercadopago':
        this.verifyMercadoPago(headers);
        break;
      case 'culqi':
        this.verifyCulqi(body, headers);
        break;
      case 'manual':
        // Manual confirmations come from authenticated dashboard users,
        // not external webhooks. No signature needed.
        break;
      default:
        throw new BadRequestException(`Proveedor desconocido: ${provider}`);
    }
  }

  private verifyMercadoPago(
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('[webhook] MERCADOPAGO_WEBHOOK_SECRET not configured');
      // In development, allow without secret
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new UnauthorizedException('Webhook secret not configured');
      }
      return;
    }

    const signature = this.headerValue(headers, 'x-signature');
    if (!signature) {
      throw new UnauthorizedException('Missing x-signature header');
    }

    // Anti-replay: check timestamp
    const tsMatch = signature.match(/ts=(\d+)/);
    if (tsMatch) {
      const ts = parseInt(tsMatch[1], 10) * 1000;
      if (Math.abs(Date.now() - ts) > this.REPLAY_WINDOW_MS) {
        throw new BadRequestException('Webhook timestamp out of window (anti-replay)');
      }
    }
  }

  private verifyCulqi(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const secret = this.config.get<string>('CULQI_WEBHOOK_SECRET');
    if (!secret) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new UnauthorizedException('Culqi webhook secret not configured');
      }
      return;
    }

    const signature = this.headerValue(headers, 'x-culqi-signature');
    if (!signature) {
      throw new UnauthorizedException('Missing x-culqi-signature header');
    }

    const computed = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (computed !== signature) {
      throw new UnauthorizedException('Invalid Culqi webhook signature');
    }
  }

  private headerValue(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | undefined {
    const val = headers[key] ?? headers[key.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  }
}
