import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.services_page_title,
    description: dictionary.services_page_subtitle,
    alternates: { languages: { en: "/en/services", vi: "/vi/services" } },
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

  const services = [
    {
      key: "tax",
      img: "/images/service-tax.png",
      title: dictionary.services_tax_title,
      desc: dictionary.services_tax_desc,
      link: `/${locale}/services/tax`,
      pricing: "$50 – $800",
    },
    {
      key: "insurance",
      img: "/images/service-insurance.png",
      title: dictionary.services_insurance_title,
      desc: dictionary.services_insurance_desc,
      link: `/${locale}/services/insurance`,
      pricing: locale === "vi" ? "Tư Vấn Miễn Phí" : "Free Consultation",
    },
    {
      key: "immigration",
      img: "/images/service-immigration.png",
      title: dictionary.services_immigration_title,
      desc: dictionary.services_immigration_desc,
      link: `/${locale}/services/immigration`,
      pricing: locale === "vi" ? "Theo Hồ Sơ" : "Case-Based",
    },
    {
      key: "ai",
      img: "/images/service-ai.png",
      title: dictionary.services_ai_title,
      desc: dictionary.services_ai_desc,
      link: `/${locale}/services/ai`,
      pricing: locale === "vi" ? "Báo Giá Riêng" : "Custom Pricing",
    },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">
            {dictionary.services_page_title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {dictionary.services_page_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s) => (
            <div
              key={s.key}
              className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div className="p-8 flex gap-6">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-teal-light p-2 shrink-0">
                  <Image
                    src={s.img}
                    alt={s.title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-charcoal mb-2">{s.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    {s.desc}
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-light text-primary text-xs font-semibold mb-4">
                    {s.pricing}
                  </div>
                  <div className="flex gap-3">
                    <Link href={s.link}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full gap-1 text-sm"
                      >
                        {dictionary.services_learn_more}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/contact`}>
                      <Button
                        size="sm"
                        className="rounded-full bg-primary hover:bg-teal-dark text-white text-sm"
                      >
                        {dictionary.services_cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
