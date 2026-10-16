import { describe, expect, it } from 'vitest';
import { PUBLIC_COPY } from './copy';
import { electionNoticeActive, landingJsonLd, landingMetadata, stateJsonLd, stateMetadata } from './seo';
import { STATES } from '../state-data';
import { buildStatePage } from './state-page';

describe('landing metadata', () => {
  it('has its own title, a description of at most 160 characters, canonical and hreflang', () => {
    for (const locale of ['vi', 'en'] as const) {
      const m = landingMetadata(locale);
      expect(m.title).toEqual({ absolute: PUBLIC_COPY[locale].landing.metaTitle });
      expect((m.description ?? '').length).toBeLessThanOrEqual(160);
      expect(m.alternates).toEqual({
        canonical: `/${locale}/n400ready`,
        languages: { en: '/en/n400ready', vi: '/vi/n400ready', 'x-default': '/en/n400ready' },
      });
    }
    expect(landingMetadata('vi').description).toContain('miễn phí');
  });
});

describe('landing JSON-LD', () => {
  const graph = (landingJsonLd('vi')['@graph'] as Record<string, unknown>[]);
  const byType = (t: string) => graph.find((n) => n['@type'] === t)!;

  it('describes a free web application published by the organization, with no rating', () => {
    const app = byType('WebApplication');
    expect(app.name).toBe('N400 Ready');
    expect(app.offers).toEqual({ '@type': 'Offer', price: 0, priceCurrency: 'USD' });
    expect(app.publisher).toEqual({ '@id': 'https://www.mannaos.com/#organization' });
    expect(app.url).toBe('https://www.mannaos.com/vi/n400ready');
    expect(JSON.stringify(graph)).not.toContain('aggregateRating');
  });

  it('marks up exactly the FAQ the page shows', () => {
    const faq = byType('FAQPage');
    const items = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(items.map((i) => i.name)).toEqual(PUBLIC_COPY.vi.landing.faq.map((f) => f.q));
    expect(items.map((i) => i.acceptedAnswer.text)).toEqual(PUBLIC_COPY.vi.landing.faq.map((f) => f.a));
  });

  it('has a two-step breadcrumb with absolute URLs', () => {
    const items = byType('BreadcrumbList').itemListElement as { position: number; item: string }[];
    expect(items.map((i) => i.item)).toEqual(['https://www.mannaos.com/vi', 'https://www.mannaos.com/vi/n400ready']);
  });
});

describe('state metadata', () => {
  it('keeps every description at 160 characters or fewer', () => {
    for (const s of STATES) {
      for (const locale of ['vi', 'en'] as const) {
        const d = stateMetadata(s.code, locale).description ?? '';
        expect(d.length, `${s.code} ${locale}: ${d}`).toBeLessThanOrEqual(160);
        expect(d).not.toMatch(/null|undefined/);
      }
    }
  });

  it('has canonical + hreflang for the state URL', () => {
    expect(stateMetadata('TX', 'vi').alternates).toEqual({
      canonical: '/vi/n400ready/states/texas',
      languages: { en: '/en/n400ready/states/texas', vi: '/vi/n400ready/states/texas', 'x-default': '/en/n400ready/states/texas' },
    });
    expect(stateMetadata('TX', 'vi').title).toEqual({ absolute: 'Thi quốc tịch Mỹ Texas: thượng nghị sĩ, dân biểu, thống đốc, thủ phủ' });
  });

  it('names the officials in the description when it fits, and never for D.C./territories', () => {
    expect(stateMetadata('TX', 'en').description).toContain('Cornyn');
    expect(stateMetadata('DC', 'en').description).not.toContain('Bowser');
  });
});

describe('state JSON-LD', () => {
  it('marks up the four visible Q/A pairs and a three-step breadcrumb', () => {
    const data = buildStatePage('TX', 'vi');
    const graph = stateJsonLd(data, 'vi')['@graph'] as Record<string, unknown>[];
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(faq.map((f) => f.name)).toEqual(data.answers.map((a) => a.question));
    expect(faq[1].acceptedAnswer.text).toContain(data.districts[0].name);
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement as { item: string }[];
    expect(crumbs.map((c) => c.item)).toEqual([
      'https://www.mannaos.com/vi',
      'https://www.mannaos.com/vi/n400ready',
      'https://www.mannaos.com/vi/n400ready/states/texas',
    ]);
  });
});

describe('electionNoticeActive', () => {
  it('shows until the end of January 2027', () => {
    expect(electionNoticeActive(new Date('2026-10-16T00:00:00Z'))).toBe(true);
    expect(electionNoticeActive(new Date('2027-01-31T23:00:00Z'))).toBe(true);
    expect(electionNoticeActive(new Date('2027-02-01T00:00:00Z'))).toBe(false);
  });
});
