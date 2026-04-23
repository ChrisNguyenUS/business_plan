import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.insurance_title, description: d.insurance_desc, alternates: { languages: { en: "/en/services/insurance", vi: "/vi/services/insurance" } } };
}

export default async function InsurancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const faqs = [
    { q: "How much does a life insurance consultation cost?", a: "Consultations are completely free. We help you understand your options before you make any decisions." },
    { q: "What types of life insurance do you offer?", a: "We offer term life, whole life, universal life, and indexed universal life insurance from top-rated carriers." },
    { q: "Can I get insurance with pre-existing conditions?", a: "Yes, many carriers offer policies for people with pre-existing conditions. We'll help you find the best option for your situation." },
    { q: "Do you explain policies in Vietnamese?", a: "Yes! We provide full bilingual service so you can understand every detail of your policy in Vietnamese or English." },
    { q: "What is an annuity and is it right for me?", a: "An annuity is a financial product that provides guaranteed income, typically for retirement. We'll assess your financial goals to determine if it's a good fit." },
  ];

  return (
    <ServicePageTemplate
      title={d.insurance_title}
      desc={d.insurance_desc}
      services={Array.isArray(d.insurance_services) && d.insurance_services.length > 0 ? [] : [d.insurance_s1, d.insurance_s2, d.insurance_s3]}
      pricing={
        Array.isArray(d.insurance_services) && d.insurance_services.length > 0
          ? d.insurance_services.map((s) => ({ service: s.name, price: s.price }))
          : undefined
      }
      pricingNote={d.insurance_pricing_note}
      faqs={faqs}
      badgeText="Licensed Insurance Agent"
      ctaText={d.insurance_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
