import { describe, expect, it } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../next.config';

async function headersFor(path: string) {
  const res = await unstable_getResponseFromNextConfig({ url: `https://www.mannaos.com${path}`, nextConfig });
  return res.headers;
}

function directive(csp: string, name: string): string {
  return csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
}

describe('content security policy', () => {
  // The full policy is enforced. Before that, it ran report-only on prod and a
  // signed-in pass over the N400 app, admin, portal and public pages logged
  // zero violations (2026-11-05).
  it('enforces the full policy on every page and drops the report-only copy', async () => {
    for (const path of ['/vi', '/n400ready/setup', '/vi/admin']) {
      const h = await headersFor(path);
      const csp = h.get('content-security-policy') ?? '';
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("default-src 'self'");
      expect(directive(csp, 'script-src')).toContain('https://www.googletagmanager.com');
      expect(directive(csp, 'connect-src')).toContain('https://api.geoapify.com');
      expect(h.get('content-security-policy-report-only')).toBeNull();
    }
  });

  it('allows what the site calls: GA4, Meta, Supabase, Geoapify, Sentry ingest', async () => {
    const csp = (await headersFor('/n400ready/setup')).get('content-security-policy') ?? '';
    const connect = directive(csp, 'connect-src');
    for (const host of [
      'https://*.google-analytics.com',
      'https://graph.facebook.com',
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.ingest.sentry.io',
      'https://*.ingest.us.sentry.io',
    ]) {
      expect(connect).toContain(host);
    }
    expect(directive(csp, 'media-src')).toContain('https://*.supabase.co');
  });

  // eval is only for `next dev` tooling; tests and production builds never get it.
  it('has no unsafe-eval outside next dev', async () => {
    const csp = (await headersFor('/vi')).get('content-security-policy') ?? '';
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-eval'");
  });
});
