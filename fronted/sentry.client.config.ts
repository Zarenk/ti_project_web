import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',

    // Performance: sample 10% in prod, 100% in dev
    tracesSampleRate:
      process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Replay: capture 5% of sessions, 100% of error sessions
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter noisy client errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'AbortError',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
    ],

    // Scrub auth tokens from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
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
}
