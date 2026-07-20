import { describe, expect, it } from 'vitest';
import {
  buildTouch,
  hasAttributionSignal,
  mergeAttributionCookie,
  parseAttributionCookie,
} from './attribution';

const url = (s: string) => new URL(s, 'https://mannaos.com');

describe('hasAttributionSignal', () => {
  it('detects utm and click ids', () => {
    expect(hasAttributionSignal(url('/n400ready?utm_source=facebook'))).toBe(true);
    expect(hasAttributionSignal(url('/n400ready?fbclid=abc'))).toBe(true);
    expect(hasAttributionSignal(url('/n400ready'))).toBe(false);
  });
});

describe('buildTouch', () => {
  it('captures utm params, referrer and landing page', () => {
    const t = buildTouch(url('/vi/services?utm_source=fb&utm_campaign=n400_t1&fbclid=x1'), 'https://facebook.com/');
    expect(t.utm_source).toBe('fb');
    expect(t.utm_campaign).toBe('n400_t1');
    expect(t.fbclid).toBe('x1');
    expect(t.referrer).toBe('https://facebook.com/');
    expect(t.landing_page).toBe('/vi/services');
    expect(t.ts).toBeTruthy();
  });

  it('truncates oversized values', () => {
    const long = 'x'.repeat(500);
    const t = buildTouch(url(`/a?utm_source=${long}`), null);
    expect(t.utm_source!.length).toBeLessThanOrEqual(200);
  });
});

describe('mergeAttributionCookie', () => {
  const first = buildTouch(url('/?utm_source=google'), null);
  const later = buildTouch(url('/?utm_source=facebook'), null);

  it('creates first+last on empty cookie', () => {
    const merged = mergeAttributionCookie(null, first);
    expect(merged.first.utm_source).toBe('google');
    expect(merged.last.utm_source).toBe('google');
  });

  it('keeps first touch, replaces last touch', () => {
    const c0 = mergeAttributionCookie(null, first);
    const c1 = mergeAttributionCookie(JSON.stringify(c0), later);
    expect(c1.first.utm_source).toBe('google');
    expect(c1.last.utm_source).toBe('facebook');
  });

  it('survives a corrupted cookie', () => {
    const merged = mergeAttributionCookie('{not json', later);
    expect(merged.first.utm_source).toBe('facebook');
  });
});

describe('parseAttributionCookie', () => {
  it('returns null on garbage', () => {
    expect(parseAttributionCookie(undefined)).toBeNull();
    expect(parseAttributionCookie(']]')).toBeNull();
  });
});
