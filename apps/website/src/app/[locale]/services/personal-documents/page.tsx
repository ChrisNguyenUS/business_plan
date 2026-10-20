import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return {
    title: d.personal_title,
    description: d.personal_desc,
    alternates: localeAlternates(locale as Locale, "/services/personal-documents"),
  };
}

// Everyday U.S. paperwork help. A top-level category of its own, separate from Immigration.
export default async function PersonalDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  return (
    <ServicePageTemplate
      title={d.personal_title}
      desc={d.personal_desc}
      note={d.personal_note}
      services={d.personal_offerings}
      faqs={d.personal_faqs}
      ctaText={d.services_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
