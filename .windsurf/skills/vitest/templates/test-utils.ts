/**
 * Common test utilities for Vitest
 */
import { vi } from 'vitest';

/**
 * Create a mock function with typed implementation
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>(
  implementation?: T
) {
  return vi.fn(implementation) as unknown as T & ReturnType<typeof vi.fn>;
}

/**
 * Wait for condition to be true (useful for async UI updates)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  { timeout = 5000, interval = 50 } = {}
): Promise<void> {
  const start = Date.now();

  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timed out after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Mock fetch with typed responses
 */
export function mockFetch(responses: Record<string, unknown>) {
  const mockFn = vi.fn(async (url: string) => {
    const response = responses[url];
    if (response === undefined) {
      return {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    };
  });

  vi.stubGlobal('fetch', mockFn);
  return mockFn;
}

/**
 * Reset all mocks and timers
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

/**
 * Flush all pending promises
 */
export async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
