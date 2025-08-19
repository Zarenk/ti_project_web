import { RedisOptions } from 'ioredis';

/**
 * Flag indicating if Redis integration is enabled. Set `REDIS_ENABLED=false`
 * to disable all queue and worker initialisation during local development.
 */
export const redisEnabled = process.env.REDIS_ENABLED !== 'false';

/**
 * Shared Redis configuration used by BullMQ queues and workers. The
 * `retryStrategy` returning `null` prevents ioredis from endlessly attempting
 * to reconnect when a server is not available, avoiding a flood of
 * `ECONNREFUSED` errors on startup.
*/

export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
  retryStrategy: () => null,
};