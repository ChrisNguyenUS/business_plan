import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

/**
 * Canonical + reciprocal hreflang for a page that exists in both locales.
 * `path` is everything after the locale segment ("" for the home page).
 * Paths stay relative; the layout's metadataBase makes them absolute.
 */
export function localeAlternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      en: `/en${path}`,
      vi: `/vi${path}`,
      "x-default": `/en${path}`,
    },
  };
}
