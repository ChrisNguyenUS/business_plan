import { describe, expect, it } from 'vitest';
import { PUBLIC_COPY, ctaHref } from './copy';

const allText = (v: unknown): string => JSON.stringify(v).toLowerCase();

describe('public N400 copy', () => {
  it('never claims expertise or names the EB-3 partner', () => {
    for (const locale of ['vi', 'en'] as const) {
      const text = allText(PUBLIC_COPY[locale]);
      for (const banned of ['chuyên gia', 'expert', 'chuyên môn di trú', 'guarantee', 'đảm bảo đậu']) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it('carries the non-attorney and not-USCIS disclosure in both languages', () => {
    expect(PUBLIC_COPY.vi.disclosure).toContain('không phải hãng luật');
    expect(PUBLIC_COPY.vi.disclosure).toContain('không liên kết với USCIS');
    expect(PUBLIC_COPY.en.disclosure).toContain('not a law firm');
    expect(PUBLIC_COPY.en.disclosure).toContain('not affiliated with USCIS');
  });

  it('has the same structure in both languages', () => {
    expect(PUBLIC_COPY.en.landing.modules).toHaveLength(PUBLIC_COPY.vi.landing.modules.length);
    expect(PUBLIC_COPY.en.landing.faq).toHaveLength(PUBLIC_COPY.vi.landing.faq.length);
  });

  it('only describes modules the app really has (no reading module)', () => {
    expect(allText(PUBLIC_COPY.vi.landing.modules)).not.toContain('tập đọc');
    expect(allText(PUBLIC_COPY.en.landing.modules)).not.toContain('reading');
  });

  it('sends CTAs to the login page in the page language', () => {
    expect(ctaHref('vi')).toBe('/n400ready/login?lang=vi');
    expect(ctaHref('en')).toBe('/n400ready/login?lang=en');
  });
});
