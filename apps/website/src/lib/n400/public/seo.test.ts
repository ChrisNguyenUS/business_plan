import { describe, expect, it } from 'vitest';
import { PUBLIC_COPY } from './copy';
import { landingJsonLd, landingMetadata } from './seo';

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
