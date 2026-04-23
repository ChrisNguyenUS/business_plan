import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import ServicePageTemplate from "@/components/services/ServicePageTemplate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.tax_title, description: d.tax_desc, alternates: { languages: { en: "/en/services/tax", vi: "/vi/services/tax" } } };
}

export default async function TaxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const faqs = [
    { q: "What documents do I need for tax preparation?", a: "You'll need W-2 forms, 1099 forms, Social Security numbers, previous year's tax return, and any deduction receipts. We'll provide a complete checklist at your consultation." },
    { q: "Can you file taxes for someone with an ITIN?", a: "Yes! We regularly help individuals with ITINs file their taxes and can also assist with ITIN applications." },
    { q: "How long does LLC setup take?", a: "LLC formation in Texas typically takes 1-3 business days for standard processing. We handle all paperwork including EIN registration." },
    { q: "Do you offer tax preparation in Vietnamese?", a: "Absolutely. Our team is fully bilingual in Vietnamese and English. We can explain everything in your preferred language." },
    { q: "What is the deadline for filing taxes?", a: "The standard deadline is April 15th. If you need more time, we can file an extension (Form 4868) to give you until October 15th." },
  ];

  const offerings = d.tax_offerings || [];
  const services = d.tax_services || [];

  return (
    <ServicePageTemplate
      title={d.tax_title}
      desc={d.tax_desc}
      services={offerings.map(o => o.name)}
      pricing={
        services.map((s) => ({ service: s.name, price: s.price }))
      }
      faqs={faqs}
      badgeText="EFIN Licensed"
      ctaText={d.services_cta}
      dictionary={d}
      locale={locale as Locale}
    />
  );
}
