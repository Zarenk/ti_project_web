import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config';

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

export const generateQueue = new Queue(ADS_GENERATE_QUEUE, {
  connection: redisConfig,
  defaultJobOptions,
});

export const publishQueue = new Queue(ADS_PUBLISH_QUEUE, {
  connection: redisConfig,
  defaultJobOptions,
});

export const generateDlqQueue = new Queue(ADS_GENERATE_DLQ, {
  connection: redisConfig,
});
export const publishDlqQueue = new Queue(ADS_PUBLISH_DLQ, {
  connection: redisConfig,
});