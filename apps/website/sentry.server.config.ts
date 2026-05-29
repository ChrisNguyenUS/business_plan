// Sentry server-side init.
// DSN-gated: if SENTRY_DSN is unset (every dev environment by default,
// and any deploy without the env var configured) the SDK no-ops. Once
// the operator sets SENTRY_DSN in Vercel, errors start flowing.
//
// Loaded by instrumentation.ts on the Node.js runtime. The browser
// runtime initializes through src/instrumentation-client.ts.

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Conservative sampling — 10% in production, 100% in dev so we can
    // see what's flowing while wiring this up. Override with
    // SENTRY_TRACES_SAMPLE_RATE if you want to dial it.
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE ??
        (process.env.NODE_ENV === 'production' ? '0.1' : '1.0'),
    ),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // Defense-in-depth PII scrub — n400 setup never persists street
    // addresses, but if a future code path ever puts an address into a
    // throw or breadcrumb we want it nuked before it leaves the server.
    beforeSend(event) {
      if (event.request?.url?.includes('/n400app/setup')) {
        if (event.request.data) event.request.data = '[scrubbed]';
        if (event.request.query_string) event.request.query_string = '[scrubbed]';
      }
      return event;
    },
  });
}
