// Sentry browser init. Mirrors server config — DSN-gated, scoped
// sampling, environment tag. The PUBLIC_ prefix is required because
// this file runs in the browser.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
        (process.env.NODE_ENV === 'production' ? '0.1' : '1.0'),
    ),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // No replay/profiling for v1 — keep the browser bundle small.
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
