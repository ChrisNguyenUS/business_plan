// The browser's only door to Sentry, loaded on demand and only in builds that
// have a browser DSN (instrumentation-client.ts, the N400 voice hook). It
// imports what it needs by name: a bare import('@sentry/nextjs') pulls in the
// whole SDK (174 KB gzip in a test build) instead of what we use.
import { captureMessage, captureRouterTransitionStart, init } from '@sentry/nextjs';

export { captureMessage };

export function startSentryBrowser(dsn: string) {
  init({
    dsn,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
        (process.env.NODE_ENV === 'production' ? '0.1' : '1.0'),
    ),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // No replay/profiling for v1 — keep the browser bundle small.
  });
  return captureRouterTransitionStart;
}
