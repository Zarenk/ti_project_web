/** Simple token bucket rate limiter */
export class RateLimiter {
  private tokens: number;
  private queue: Array<() => void> = [];

  constructor(private limit: number, private intervalMs: number) {
    this.tokens = limit;
    setInterval(() => {
      this.tokens = this.limit;
      this.process();
    }, this.intervalMs).unref();
  }

  private process() {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }

  private async acquire(): Promise<void> {
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      // nothing
    }
  }
}