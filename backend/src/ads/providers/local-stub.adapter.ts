import {
  ImageGenerationProvider,
  GenerationRequest,
  GenerationResult,
} from './interfaces';
import { RateLimiter } from './rate-limiter';

export class LocalStubAdapter implements ImageGenerationProvider {
  private limiter: RateLimiter;

  constructor(limit = 5, intervalMs = 1000) {
    this.limiter = new RateLimiter(limit, intervalMs);
  }

  name(): string {
    return 'local-stub';
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const exec = async () => {
      const size = request.size ?? '512x512';
      const url = `https://placehold.co/${size}?text=stub`;
      return { url, cost: 0, provider: this.name() };
    };
    return this.limiter.schedule(exec);
  }
}
