import { describe, expect, it } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../next.config';

async function headersFor(path: string) {
  const res = await unstable_getResponseFromNextConfig({ url: `https://www.mannaos.com${path}`, nextConfig });
  return res.headers;
}

describe('content security policy', () => {
  // Enforced: only directives that cannot break the site's own scripts,
  // styles, images or API calls.
  it('enforces framing, plugin and base-tag rules on every page', async () => {
    for (const path of ['/vi', '/n400ready/setup', '/vi/admin']) {
      const csp = (await headersFor(path)).get('content-security-policy') ?? '';
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).not.toContain('script-src');
      expect(csp).not.toContain('connect-src');
    }
  });

  // Report-only: the full policy must list what the site really uses, or it
  // can never be switched on (N400 address autocomplete, admin audio, GA4).
  it('lists the hosts the site calls in the report-only policy', async () => {
    const csp = (await headersFor('/n400ready/setup')).get('content-security-policy-report-only') ?? '';
    const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('connect-src')).toContain('https://api.geoapify.com');
    expect(directive('connect-src')).toContain('https://*.google-analytics.com');
    expect(directive('media-src')).toContain('https://*.supabase.co');
  });
});
