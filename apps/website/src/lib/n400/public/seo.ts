// Metadata + JSON-LD for the public N400 Ready pages. Structured data is
// built from the same copy arrays the pages render (spec §7–§8).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/seo/site';
import { PUBLIC_COPY, type FaqItem } from './copy';
import { STATES_BY_CODE, type StateCode } from '../state-data';
import { NON_STATE_CODES } from '../location-rules';
import { stateSlug } from './state-slugs';
import type { StatePageData } from './state-page';

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

export function stateMetadata(code: StateCode, locale: Locale): Metadata {
  const info = STATES_BY_CODE[code];
  const c = PUBLIC_COPY[locale].state;
  const name = locale === 'vi' ? info.nameVi : info.nameEn;
  const full = NON_STATE_CODES.has(code)
    ? null
    : c.metaDescription({ name, senators: info.senators, governor: info.governor, capital: info.capital });
  const description = full && full.length <= 160 ? full : c.metaDescriptionShort(name);
  const path = `/n400ready/states/${stateSlug(code)}`;
  return {
    title: { absolute: c.metaTitle(name) },
    description,
    alternates: localeAlternates(locale, path),
    openGraph: { type: 'website', url: `/${locale}${path}`, title: c.metaTitle(name), description },
  };
}

export function stateJsonLd(data: StatePageData, locale: Locale): Record<string, unknown> {
  const c = PUBLIC_COPY[locale];
  const faq = data.answers.map((a) => ({
    q: a.question,
    a: [...(a.answers.length > 0 ? a.answers : data.districts.map((d) => `${d.label}: ${d.name}`)), a.note]
      .filter(Boolean)
      .join('; '),
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: c.home, path: `/${locale}` },
        { name: 'N400 Ready', path: `/${locale}/n400ready` },
        { name: data.name, path: `/${locale}/n400ready/states/${data.slug}` },
      ]),
      faqJsonLd(faq),
    ],
  };
}

const ELECTION_NOTICE_UNTIL = Date.parse('2027-02-01T00:00:00Z');
export function electionNoticeActive(now: Date): boolean {
  return now.getTime() < ELECTION_NOTICE_UNTIL;
}
