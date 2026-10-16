// Metadata + JSON-LD for the public N400 Ready pages. Structured data is
// built from the same copy arrays the pages render (spec §7–§8).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/seo/site';
import { PUBLIC_COPY, type FaqItem } from './copy';

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

export function faqJsonLd(faq: FaqItem[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function landingMetadata(locale: Locale): Metadata {
  const c = PUBLIC_COPY[locale].landing;
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: localeAlternates(locale, '/n400ready'),
    openGraph: { type: 'website', url: `/${locale}/n400ready`, title: c.metaTitle, description: c.metaDescription },
  };
}

export function landingJsonLd(locale: Locale): Record<string, unknown> {
  const c = PUBLIC_COPY[locale];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'N400 Ready',
        url: `${SITE_URL}/${locale}/n400ready`,
        description: c.landing.metaDescription,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: ['vi', 'en'],
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
        publisher: { '@id': ORGANIZATION_ID },
      },
      breadcrumbJsonLd([
        { name: c.home, path: `/${locale}` },
        { name: 'N400 Ready', path: `/${locale}/n400ready` },
      ]),
      faqJsonLd(c.landing.faq),
    ],
  };
}
