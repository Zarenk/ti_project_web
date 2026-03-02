import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
  AiStreamChunk,
} from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';

/** How many consecutive failures before we skip a provider */
const CIRCUIT_BREAKER_THRESHOLD = 2;
/** How long (ms) to skip the tripped provider before retrying */
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AiProviderManager {
  private readonly primary: AiProvider | null;
  private readonly fallback: AiProvider | null;
  private readonly logger = new Logger(AiProviderManager.name);

  /** Circuit breaker state per provider name */
  private failures = new Map<string, number>();
  private trippedUntil = new Map<string, number>();

  constructor(config: ConfigService) {
    const openaiKey = config.get<string>('OPENAI_API_KEY');
    const anthropicKey = config.get<string>('ANTHROPIC_API_KEY');

    const openai = new OpenAIProvider(openaiKey);
    const anthropic = new AnthropicProvider(anthropicKey);

    if (openai.isAvailable()) {
      this.primary = openai;
      this.fallback = anthropic.isAvailable() ? anthropic : null;
    } else if (anthropic.isAvailable()) {
      this.primary = anthropic;
      this.fallback = null;
    } else {
      this.primary = null;
      this.fallback = null;
    }

    this.logger.log(
      `AI providers: primary=${this.primary?.name ?? 'none'}, fallback=${this.fallback?.name ?? 'none'}`,
    );
  }

  get isAvailable(): boolean {
    return this.primary !== null && this.primary.isAvailable();
  }

  /** Check if a provider's circuit breaker is tripped */
  private isTripped(provider: AiProvider): boolean {
    const until = this.trippedUntil.get(provider.name);
    if (!until) return false;
    if (Date.now() >= until) {
      // Cooldown expired — reset and allow retry
      this.trippedUntil.delete(provider.name);
      this.failures.set(provider.name, 0);
      this.logger.log(`Circuit breaker reset for ${provider.name}, retrying`);
      return false;
    }
    return true;
  }

  /** Record a failure; trip the breaker if threshold reached */
  private recordFailure(provider: AiProvider): void {
    const count = (this.failures.get(provider.name) ?? 0) + 1;
    this.failures.set(provider.name, count);
    if (count >= CIRCUIT_BREAKER_THRESHOLD) {
      const until = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
      this.trippedUntil.set(provider.name, until);
      this.logger.warn(
        `Circuit breaker TRIPPED for ${provider.name} after ${count} failures — skipping for ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`,
      );
    }
  }

  /** Record a success; reset the failure counter */
  private recordSuccess(provider: AiProvider): void {
    if (this.failures.get(provider.name)) {
      this.failures.set(provider.name, 0);
    }
  }

  /** Pick the best available provider (respects circuit breaker) */
  private pickProvider(): AiProvider | null {
    if (this.primary && !this.isTripped(this.primary)) return this.primary;
    if (this.fallback?.isAvailable() && !this.isTripped(this.fallback)) return this.fallback;
    // Both tripped — try primary anyway as last resort
    if (this.primary) return this.primary;
    return null;
  }

  async chat(request: AiProviderRequest): Promise<AiProviderResponse> {
    const provider = this.pickProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }

    try {
      const result = await provider.chat(request);
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      this.logger.error(`Provider ${provider.name} failed: ${error}`);
      this.recordFailure(provider);

      // Try the other provider
      const other = provider === this.primary ? this.fallback : this.primary;
      if (other?.isAvailable() && !this.isTripped(other)) {
        this.logger.log(`Falling back to ${other.name}`);
        try {
          const result = await other.chat(request);
          this.recordSuccess(other);
          return result;
        } catch (fallbackError) {
          this.logger.error(`Fallback ${other.name} also failed: ${fallbackError}`);
          this.recordFailure(other);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async *chatStream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiStreamChunk> {
    const provider = this.pickProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }

    try {
      let hasYielded = false;
      for await (const chunk of provider.chatStream(request)) {
        hasYielded = true;
        yield chunk;
      }
      if (hasYielded) this.recordSuccess(provider);
    } catch (error) {
      this.logger.error(`Stream ${provider.name} failed: ${error}`);
      this.recordFailure(provider);

      const other = provider === this.primary ? this.fallback : this.primary;
      if (other?.isAvailable() && !this.isTripped(other)) {
        this.logger.log(`Stream falling back to ${other.name}`);
        try {
          yield* other.chatStream(request);
          this.recordSuccess(other);
        } catch (fallbackError) {
          this.logger.error(`Stream fallback ${other.name} also failed: ${fallbackError}`);
          this.recordFailure(other);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }
}
