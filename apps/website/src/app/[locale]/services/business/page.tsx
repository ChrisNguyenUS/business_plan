import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.business_title, description: d.business_desc, alternates: localeAlternates(locale as Locale, "/services/business") };
}

export default async function BusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  return (
    <ServicePageTemplate
      title={d.business_title}
      desc={d.business_desc}
      note={d.business_note}
      services={d.business_offerings}
      faqs={d.business_faqs}
      ctaText={d.services_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
