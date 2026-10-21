import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.insurance_title, description: d.insurance_desc, alternates: localeAlternates(locale as Locale, "/services/insurance") };
}

export default async function InsurancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  return (
    <ServicePageTemplate
      title={d.insurance_title}
      desc={d.insurance_desc}
      services={Array.isArray(d.insurance_offerings) ? d.insurance_offerings.map(o => o.name) : []}
      faqs={d.insurance_faqs}
      badgeText={d.insurance_badge}
      note={d.insurance_note}
      ctaText={d.insurance_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
