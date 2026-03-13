import { Injectable, Logger } from '@nestjs/common';

import type { PaymentAdapter } from './payment-adapter.interface';
import { CulqiAdapter } from './culqi.adapter';
import { MercadoPagoAdapter } from './mercadopago.adapter';
import { ManualAdapter } from './manual.adapter';

interface CircuitState {
  failures: number;
  trippedUntil: number;
}

/**
 * Registry that resolves the correct adapter by provider name and
 * applies a circuit breaker pattern to prevent cascading failures.
 */
@Injectable()
export class PaymentAdapterRegistry {
  private readonly logger = new Logger(PaymentAdapterRegistry.name);
  private readonly circuits = new Map<string, CircuitState>();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly culqi: CulqiAdapter,
    private readonly mercadopago: MercadoPagoAdapter,
    private readonly manual: ManualAdapter,
  ) {}

  getAdapter(provider: string): PaymentAdapter {
    if (this.isTripped(provider)) {
      const fallback = this.getFallbackProvider(provider);
      this.logger.warn(
        `[circuit-breaker] ${provider} tripped, falling back to ${fallback}`,
      );
      return this.resolve(fallback);
    }
    return this.resolve(provider);
  }

  recordSuccess(provider: string): void {
    this.circuits.delete(provider);
  }

  recordFailure(provider: string): void {
    const state = this.circuits.get(provider) ?? {
      failures: 0,
      trippedUntil: 0,
    };
    state.failures += 1;

    if (state.failures >= this.FAILURE_THRESHOLD) {
      state.trippedUntil = Date.now() + this.COOLDOWN_MS;
      this.logger.error(
        `[circuit-breaker] ${provider} TRIPPED after ${state.failures} failures. ` +
          `Cooldown until ${new Date(state.trippedUntil).toISOString()}`,
      );
    }
    this.circuits.set(provider, state);
  }

  private isTripped(provider: string): boolean {
    const state = this.circuits.get(provider);
    if (!state || state.trippedUntil === 0) return false;
    if (Date.now() >= state.trippedUntil) {
      // Cooldown expired — reset circuit
      this.circuits.delete(provider);
      return false;
    }
    return true;
  }

  private resolve(provider: string): PaymentAdapter {
    switch (provider) {
      case 'culqi':
        return this.culqi;
      case 'mercadopago':
        return this.mercadopago;
      case 'manual':
        return this.manual;
      default:
        return this.mercadopago;
    }
  }

  private getFallbackProvider(provider: string): string {
    return provider === 'culqi' ? 'mercadopago' : 'culqi';
  }
}
