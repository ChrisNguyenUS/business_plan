import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.ai_title, description: d.ai_desc, alternates: localeAlternates(locale as Locale, "/services/ai") };
}

export default async function AIPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const offerings = d.ai_offerings || [];

  return (
    <ServicePageTemplate
      title={d.ai_title}
      desc={d.ai_desc}
      services={offerings.map(o => o.name)}
      faqs={d.ai_faqs}
      ctaText={d.ai_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
