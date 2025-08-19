import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { redisConfig, redisEnabled } from '../config/redis.config';

// BullMQ 5+ forbids the use of ':' in queue names. The previous implementation
// used colon-delimited names (e.g. `ads:generate`), which now throws an error
// when the queue is instantiated. Replace colons with hyphens to maintain
// descriptive names while complying with BullMQ's restrictions.
export const ADS_GENERATE_QUEUE = 'ads-generate';
export const ADS_PUBLISH_QUEUE = 'ads-publish';
export const ADS_GENERATE_DLQ = 'ads-generate-dlq';
export const ADS_PUBLISH_DLQ = 'ads-publish-dlq';

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 24 * 3600 },
};

const logger = new Logger('AdsQueue');

export let generateQueue: Queue | null = null;
export let publishQueue: Queue | null = null;
export let generateDlqQueue: Queue | null = null;
export let publishDlqQueue: Queue | null = null;

if (redisEnabled) {
  generateQueue = new Queue(ADS_GENERATE_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  generateQueue.on('error', (err) => {
    logger.error(`Redis error on ${ADS_GENERATE_QUEUE}: ${err.message}`);
    generateQueue = null;
  });

  publishQueue = new Queue(ADS_PUBLISH_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  publishQueue.on('error', (err) => {
    logger.error(`Redis error on ${ADS_PUBLISH_QUEUE}: ${err.message}`);
    publishQueue = null;
  });

  generateDlqQueue = new Queue(ADS_GENERATE_DLQ, {
    connection: redisConfig,
  });
  generateDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${ADS_GENERATE_DLQ}: ${err.message}`);
    generateDlqQueue = null;
  });

  publishDlqQueue = new Queue(ADS_PUBLISH_DLQ, {
    connection: redisConfig,
  });
  publishDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${ADS_PUBLISH_DLQ}: ${err.message}`);
    publishDlqQueue = null;
  });
}