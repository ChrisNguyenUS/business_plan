import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, middleware } from './middleware';

const request = (path: string) => new NextRequest(new URL(path, 'https://www.mannaos.com'));

describe('middleware and the N400 service worker', () => {
  // navigator.serviceWorker.register() rejects a script that sits behind a
  // redirect, so /sw-n400.js must be served as-is, never sent to /en/sw-n400.js.
  it('the matcher skips /sw-n400.js', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/sw-n400.js' })).toBe(false);
  });

  it('does not redirect /sw-n400.js even when it runs', async () => {
    const res = await middleware(request('/sw-n400.js'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('still sends a page without a locale to one', async () => {
    const res = await middleware(request('/about'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toMatch(/^\/(en|vi)\/about$/);
  });
});
