/**
 * Sentry instrumentation — MUST be imported before any other module.
 * Loaded conditionally: if SENTRY_DSN is not set, Sentry is disabled.
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? undefined,

    // Performance: sample 20% of transactions in prod, 100% in dev
    tracesSampleRate:
      process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Profiling: sample 10% of profiled transactions
    profilesSampleRate: 0.1,

    integrations: [nodeProfilingIntegration()],

    // Filter noisy errors
    ignoreErrors: [
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'socket hang up',
    ],

    // Scrub sensitive data from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http') {
        const url = breadcrumb.data?.url ?? '';
        if (
          typeof url === 'string' &&
          (url.includes('/auth/') || url.includes('/login'))
        ) {
          breadcrumb.data = { ...breadcrumb.data, body: '[REDACTED]' };
        }
      }
      return breadcrumb;
    },
  });

  console.log('[Sentry] Initialized for backend');
} else {
  console.log('[Sentry] Disabled (no SENTRY_DSN)');
}
