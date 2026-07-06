// N400 Service Worker — cache-first audio caching.
//
// Purpose: ~854 MP3 files (questions, answers, senators, governors,
// reps, capitals) are served from /n400-audio/* (symlinked to
// public/N400_voice). These files are immutable per deploy — the SW
// caches them aggressively so a learner who's tapped through 50
// questions today doesn't redownload them tomorrow on cellular.
//
// Cache strategy: cache-first with a single named cache. Bumping
// CACHE_NAME below ('n400-audio-v<n>') invalidates everything on the
// next deploy when audio changes — runtime SW code reads CACHE_NAME
// from `self`, so a redeploy that ships a new version of this file
// triggers fresh caches.
//
// We deliberately do NOT cache:
//   - Questions/state/reps data — already in the static JS bundle
//   - HTML pages — Next.js + CDN handle that better than we can
//   - API routes — none of the n400 surface uses /api/* yet
//
// Scope: default (root). The SW file lives at /sw-n400.js so it
// inherits root scope automatically. RegisterSW.tsx registers with
// default scope. Anything outside /n400-audio/* falls through to
// the network unchanged.

const CACHE_NAME = 'n400-audio-v2';
const AUDIO_PREFIX = '/n400-audio/';

self.addEventListener('install', (event) => {
  // Skip waiting so a freshly-deployed SW activates immediately rather
  // than waiting for all open tabs to close. Combined with clients.claim
  // below, the new SW takes over on the next page load — important
  // because audio URLs may have changed.
  self.skipWaiting();
  void event;
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches from prior versions (n400-audio-v0, etc.).
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('n400-audio-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs to the audio path. Everything else
  // — HTML, JS, API, third-party — bypasses the SW entirely.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(AUDIO_PREFIX)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const response = await fetch(req);
        // Only cache 200 OK responses; partial-content (206) and errors
        // never get stored. response.clone() is required because
        // cache.put consumes the body.
        if (response.status === 200) {
          cache.put(req, response.clone()).catch(() => {
            // Storage quota or CORS issues shouldn't break playback.
          });
        }
        return response;
      } catch (err) {
        // Network failure with no cache hit — return a clear 503 so
        // the audio element fires an error event the UI can handle,
        // rather than hanging forever.
        return new Response('audio offline', { status: 503, statusText: 'offline' });
      }
    })(),
  );
});
