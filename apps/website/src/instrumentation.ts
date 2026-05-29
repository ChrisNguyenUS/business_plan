// Next.js 16 instrumentation hook — runs once per server instance per
// runtime (nodejs / edge). Loads the matching Sentry config.
//
// Sentry recommends placing config files at the project root (alongside
// next.config.ts), but the instrumentation hook lives in src/. We
// resolve them via two `..` segments so the build picks them up.
//
// onRequestError is Next 16's convention for the export name; Sentry
// ships it as `captureRequestError` and we re-export under the
// expected name.

import { captureRequestError } from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = captureRequestError;
