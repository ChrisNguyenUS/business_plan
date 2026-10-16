import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('accepts same-origin absolute paths', () => {
    expect(safeNextPath('/n400ready')).toBe('/n400ready');
    expect(safeNextPath('/vi/portal?x=1')).toBe('/vi/portal?x=1');
  });

  it('rejects anything that could leave the site', () => {
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('n400ready')).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it('rejects control characters and backslashes the URL parser would strip or rewrite', () => {
    expect(safeNextPath('/\t/evil.com')).toBeNull();
    expect(safeNextPath('/\n\\evil.com')).toBeNull();
    expect(safeNextPath('/\r/evil.com')).toBeNull();
    expect(safeNextPath('/n400ready\\x')).toBeNull();
  });
});
