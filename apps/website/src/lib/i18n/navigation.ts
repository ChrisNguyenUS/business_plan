import type { Locale } from './config';
import { tagBySlug, tagPath } from '@/lib/blog/tags';

// Blog hashtag pages use a different path segment and slug in each language.
const BLOG_TAG_PATH = /^\/(?:vi|en)\/blog\/(?:chu-de|topics)\/([^/]+)\/?$/;

/**
 * Get the alternate locale route for language switching.
 * In Phase A, both locales use English slugs for simplicity.
 */
export function getAlternateLocaleHref(pathname: string, currentLocale: Locale): string {
  const targetLocale = currentLocale === 'en' ? 'vi' : 'en';

  const tagSlug = BLOG_TAG_PATH.exec(pathname)?.[1];
  const tag = tagSlug ? tagBySlug(currentLocale, tagSlug) : null;
  if (tag) return tagPath(targetLocale, tag.key);

  // Replace /en/ with /vi/ or vice versa
  const newPath = pathname.replace(`/${currentLocale}`, `/${targetLocale}`);
  return newPath || `/${targetLocale}`;
}

/**
 * Get the hreflang alternate URL for a given path
 */
export function getHreflangAlternates(pathname: string, baseUrl: string) {
  // Strip the locale prefix to get the route
  const route = pathname.replace(/^\/(en|vi)/, '');
  
  return {
    en: `${baseUrl}/en${route}`,
    vi: `${baseUrl}/vi${route}`,
    'x-default': `${baseUrl}/en${route}`,
  };
}
