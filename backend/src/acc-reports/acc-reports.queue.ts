import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { redisConfig, redisEnabled } from '../config/redis.config';

export const ACC_REPORTS_QUEUE = 'acc-reports';

const defaultJobOptions = {
  attempts: 3,
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 24 * 3600 },
};

const logger = new Logger('AccReportsQueue');

export let accReportsQueue: Queue | null = null;

if (redisEnabled) {
  accReportsQueue = new Queue(ACC_REPORTS_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  accReportsQueue.on('error', (err) => {
    logger.error(`Redis error on ${ACC_REPORTS_QUEUE}: ${err.message}`);
    accReportsQueue = null;
  });
}
