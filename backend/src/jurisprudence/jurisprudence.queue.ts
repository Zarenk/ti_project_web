import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { redisConfig, redisEnabled } from '../config/redis.config';

// Queue names - BullMQ 5+ forbids colons, using hyphens instead
export const JURISPRUDENCE_SCRAPE_QUEUE = 'jurisprudence-scrape';
export const JURISPRUDENCE_EXTRACT_QUEUE = 'jurisprudence-extract';
export const JURISPRUDENCE_EMBED_QUEUE = 'jurisprudence-embed';
export const JURISPRUDENCE_RAG_ANALYTICS_QUEUE = 'jurisprudence-rag-analytics';

// Dead letter queues for failed jobs
export const JURISPRUDENCE_SCRAPE_DLQ = 'jurisprudence-scrape-dlq';
export const JURISPRUDENCE_EXTRACT_DLQ = 'jurisprudence-extract-dlq';
export const JURISPRUDENCE_EMBED_DLQ = 'jurisprudence-embed-dlq';
export const JURISPRUDENCE_RAG_ANALYTICS_DLQ = 'jurisprudence-rag-analytics-dlq';

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 }, // 1 hour
  removeOnFail: { age: 24 * 3600 }, // 24 hours
};

const logger = new Logger('JurisprudenceQueue');

// Main queues
export let scrapeQueue: Queue | null = null;
export let extractQueue: Queue | null = null;
export let embedQueue: Queue | null = null;
export let ragAnalyticsQueue: Queue | null = null;

// Dead letter queues
export let scrapeDlqQueue: Queue | null = null;
export let extractDlqQueue: Queue | null = null;
export let embedDlqQueue: Queue | null = null;
export let ragAnalyticsDlqQueue: Queue | null = null;

if (redisEnabled) {
  // Scrape Queue - Downloads PDFs from judicial sources
  scrapeQueue = new Queue(JURISPRUDENCE_SCRAPE_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  scrapeQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_SCRAPE_QUEUE}: ${err.message}`);
    scrapeQueue = null;
  });

  scrapeDlqQueue = new Queue(JURISPRUDENCE_SCRAPE_DLQ, {
    connection: redisConfig,
  });
  scrapeDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_SCRAPE_DLQ}: ${err.message}`);
    scrapeDlqQueue = null;
  });

  // Extract Queue - Extracts text from PDFs (+ OCR for scanned docs)
  extractQueue = new Queue(JURISPRUDENCE_EXTRACT_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  extractQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_EXTRACT_QUEUE}: ${err.message}`);
    extractQueue = null;
  });

  extractDlqQueue = new Queue(JURISPRUDENCE_EXTRACT_DLQ, {
    connection: redisConfig,
  });
  extractDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_EXTRACT_DLQ}: ${err.message}`);
    extractDlqQueue = null;
  });

  // Embed Queue - Generates vector embeddings with OpenAI
  embedQueue = new Queue(JURISPRUDENCE_EMBED_QUEUE, {
    connection: redisConfig,
    defaultJobOptions,
  });
  embedQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_EMBED_QUEUE}: ${err.message}`);
    embedQueue = null;
  });

  embedDlqQueue = new Queue(JURISPRUDENCE_EMBED_DLQ, {
    connection: redisConfig,
  });
  embedDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_EMBED_DLQ}: ${err.message}`);
    embedDlqQueue = null;
  });

  // RAG Analytics Queue - Post-query analytics (non-blocking)
  ragAnalyticsQueue = new Queue(JURISPRUDENCE_RAG_ANALYTICS_QUEUE, {
    connection: redisConfig,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3, // Lower retries for non-critical analytics
    },
  });
  ragAnalyticsQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_RAG_ANALYTICS_QUEUE}: ${err.message}`);
    ragAnalyticsQueue = null;
  });

  ragAnalyticsDlqQueue = new Queue(JURISPRUDENCE_RAG_ANALYTICS_DLQ, {
    connection: redisConfig,
  });
  ragAnalyticsDlqQueue.on('error', (err) => {
    logger.error(`Redis error on ${JURISPRUDENCE_RAG_ANALYTICS_DLQ}: ${err.message}`);
    ragAnalyticsDlqQueue = null;
  });

  logger.log('Jurisprudence queues initialized successfully');
} else {
  logger.warn('Redis is disabled - Jurisprudence queues will not be available');
}
