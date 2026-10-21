import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.tax_title, description: d.tax_desc, alternates: localeAlternates(locale as Locale, "/services/tax") };
}

export default async function TaxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const offerings = d.tax_offerings || [];

  return (
    <ServicePageTemplate
      title={d.tax_title}
      desc={d.tax_desc}
      services={offerings.map(o => o.name)}
      faqs={d.tax_faqs}
      badgeText={d.tax_badge}
      ctaText={d.services_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
