import { describe, expect, it } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../next.config';

describe('redirects', () => {
  // The old Categories page (the "Conquest Map") lost every link in the July
  // 2026 navigation redesign and was deleted on 2026-11-05. A saved link to it
  // lands on Civics study instead of a 404.
  it('sends the removed /n400ready/categories to Civics study', async () => {
    const res = await unstable_getResponseFromNextConfig({
      url: 'https://www.mannaos.com/n400ready/categories',
      nextConfig,
    });
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get('location')!, 'https://www.mannaos.com').pathname).toBe('/n400ready/study/civics');
  });
});
