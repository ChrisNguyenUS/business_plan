import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec D13: `microphone=()` made every Chromium browser reject speech
// recognition instantly (Gate 0 spike). Same-origin only; camera stays off.
const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

describe('Permissions-Policy header', () => {
  it('allows the microphone for our own origin only', () => {
    expect(config).toContain('microphone=(self)');
    expect(config).not.toContain('microphone=()');
  });

  it('keeps camera and geolocation blocked', () => {
    expect(config).toContain('camera=()');
    expect(config).toContain('geolocation=()');
  });
});
