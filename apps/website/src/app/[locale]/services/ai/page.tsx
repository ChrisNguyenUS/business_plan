import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.ai_title, description: d.ai_desc, alternates: { languages: { en: "/en/services/ai", vi: "/vi/services/ai" } } };
}

export default async function AIPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const faqs = [
    { q: "What kind of automation can you build for my business?", a: "We build custom automations including appointment scheduling, invoice processing, customer follow-ups, data entry automation, and more — all tailored to your specific workflow." },
    { q: "Do I need technical knowledge to use AI tools?", a: "Not at all! We build everything to be user-friendly. We also provide training and ongoing support so you can use the tools confidently." },
    { q: "How much does a typical automation project cost?", a: "Projects vary based on complexity. Simple automations start at a few hundred dollars, while comprehensive digital transformation projects are priced based on scope. We provide free estimates." },
    { q: "Can you help my Vietnamese business go digital?", a: "Absolutely. We specialize in helping Vietnamese-owned businesses adopt modern technology. We understand your business culture and needs." },
    { q: "What is a monthly retainer?", a: "A monthly retainer gives you ongoing access to our AI and automation team. We maintain your systems, add new features, and provide priority support." },
  ];

  return (
    <ServicePageTemplate
      title={d.ai_title}
      desc={d.ai_desc}
      services={[d.ai_s1, d.ai_s2, d.ai_s3, d.ai_s4]}
      faqs={faqs}
      ctaText={d.ai_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
