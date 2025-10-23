import axios from 'axios';
import { RateLimiter } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';
import {
  GenerationRequest,
  GenerationResult,
  ImageGenerationProvider,
} from './interfaces';

interface AdapterOptions {
  timeoutMs?: number;
  rateLimit?: { limit: number; intervalMs: number };
  breaker?: { maxFailures: number; resetTimeoutMs: number };
  /** model version to use */
  version?: string;
}

export class ReplicateAdapter implements ImageGenerationProvider {
  private limiter: RateLimiter;
  private breaker: CircuitBreaker;
  private timeout: number;
  private version: string;

  constructor(
    private apiKey: string,
    options: AdapterOptions = {},
  ) {
    this.timeout = options.timeoutMs ?? 10000;
    const rl = options.rateLimit ?? { limit: 1, intervalMs: 1000 };
    this.limiter = new RateLimiter(rl.limit, rl.intervalMs);
    const br = options.breaker ?? { maxFailures: 5, resetTimeoutMs: 10000 };
    this.breaker = new CircuitBreaker(br.maxFailures, br.resetTimeoutMs);
    this.version = options.version ?? 'stability-ai/sdxl';
  }

  name(): string {
    return 'replicate';
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const exec = async () => {
      const payload = {
        version: this.version,
        input: { prompt: request.prompt },
      };
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        payload,
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
          timeout: this.timeout,
        },
      );
      const url = (response.data.output as string[])[0];
      const cost = this.normalizeCost(response.data);
      return { url, cost, provider: this.name() };
    };
    return this.limiter.schedule(() => this.breaker.exec(exec));
  }

  private normalizeCost(data: any): number {
    // Replicate includes total dollar cost at data.cost?.usd
    if (data?.cost?.usd) return Number(data.cost.usd);
    // Fallback to metrics if present
    if (data?.metrics?.predict_time) {
      // assume $0.002 per second as placeholder
      return Number(data.metrics.predict_time) * 0.002;
    }
    return 0;
  }
}
