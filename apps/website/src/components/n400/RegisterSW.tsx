'use client';

// Phase 8 Task 4 — Service Worker registrar.
//
// Mounts inside the n400ready layout so the SW registers as soon as a
// learner enters the app and stays inactive on every other route.
// Default scope is /, which is what we want — the SW filters internally
// to /n400-audio/* so non-N400 pages are unaffected even though the SW
// is technically active for them.
//
// Failure modes (no service worker support, registration error, HTTPS
// downgrade in dev) silently no-op. Audio still works through the
// normal network path.

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Don't register the SW on localhost http:// — DevTools forces SW
    // off on insecure origins anyway, and registering causes spurious
    // console errors during local dev.
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('/sw-n400.js').catch(() => {
      // Registration is best-effort. A failed register is not user-visible.
    });
  }, []);
  return null;
}
