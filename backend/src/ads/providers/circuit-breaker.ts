/** Minimal circuit breaker implementation */
export class CircuitBreaker {
  private failures = 0;
  private nextTry = Date.now();

  constructor(
    private maxFailures = 5,
    private resetTimeoutMs = 10000,
  ) {}

  async exec<T>(action: () => Promise<T>): Promise<T> {
    if (Date.now() < this.nextTry) {
      throw new Error('Circuit breaker open');
    }
    try {
      const result = await action();
      this.failures = 0;
      return result;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.maxFailures) {
        this.nextTry = Date.now() + this.resetTimeoutMs;
      }
      throw err;
    }
  }
}
