// Sentry browser init. Mirrors server config — DSN-gated, scoped
// sampling, environment tag. The PUBLIC_ prefix is required because
// this file runs in the browser.
//
// The SDK is imported inside the DSN branch, not at the top: the DSN is
// inlined at build time, so a build without one drops the branch and ships
// no Sentry code at all. (2026-11-05: prod had no DSN, yet every page
// downloaded the SDK.) With a DSN, errors thrown before the import
// resolves are not reported.

type NavigationType = 'push' | 'replace' | 'traverse';

let captureTransition: ((url: string, navigationType: NavigationType) => void) | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  void import('./lib/sentry-browser').then(({ startSentryBrowser }) => {
    captureTransition = startSentryBrowser(dsn);
  });
}

export function onRouterTransitionStart(url: string, navigationType: NavigationType) {
  captureTransition?.(url, navigationType);
}
