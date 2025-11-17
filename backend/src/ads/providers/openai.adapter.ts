import axios from 'axios';
import { CircuitBreaker } from './circuit-breaker';
import {
  ImageGenerationProvider,
  GenerationRequest,
  GenerationResult,
} from './interfaces';
import { RateLimiter } from './rate-limiter';

interface AdapterOptions {
  timeoutMs?: number;
  rateLimit?: { limit: number; intervalMs: number };
  breaker?: { maxFailures: number; resetTimeoutMs: number };
}

export class OpenAIAdapter implements ImageGenerationProvider {
  private limiter: RateLimiter;
  private breaker: CircuitBreaker;
  private timeout: number;

  constructor(
    private apiKey: string,
    options: AdapterOptions = {},
  ) {
    this.timeout = options.timeoutMs ?? 10000;
    const rl = options.rateLimit ?? { limit: 1, intervalMs: 1000 };
    this.limiter = new RateLimiter(rl.limit, rl.intervalMs);
    const br = options.breaker ?? { maxFailures: 5, resetTimeoutMs: 10000 };
    this.breaker = new CircuitBreaker(br.maxFailures, br.resetTimeoutMs);
  }

  name(): string {
    return 'openai';
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const exec = async () => {
      const size = request.size ?? '512x512';
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { prompt: request.prompt, size },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: this.timeout,
        },
      );
      const url = response.data.data[0].url as string;
      const cost = this.normalizeCost(size);
      return { url, cost, provider: this.name() };
    };
    return this.limiter.schedule(() => this.breaker.exec(exec));
  }

  private normalizeCost(size: string): number {
    const table: Record<string, number> = {
      '256x256': 0.016,
      '512x512': 0.018,
      '1024x1024': 0.02,
    };
    return table[size] ?? 0.018;
  }
}
