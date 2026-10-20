import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ServicesOverviewProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ServicesOverview({ dictionary, locale }: ServicesOverviewProps) {
  const services = [
    {
      key: "immigration",
      img: "/images/service-immigration.png",
      title: dictionary.services_immigration_title,
      desc: dictionary.services_immigration_desc,
      link: `/${locale}/services/immigration`,
    },
    {
      key: "tax",
      img: "/images/service-tax.png",
      title: dictionary.services_tax_title,
      desc: dictionary.services_tax_desc,
      link: `/${locale}/services/tax`,
    },
    {
      key: "insurance",
      img: "/images/service-insurance.png",
      title: dictionary.services_insurance_title,
      desc: dictionary.services_insurance_desc,
      link: `/${locale}/services/insurance`,
    },
    {
      key: "ai",
      img: "/images/service-ai.png",
      title: dictionary.services_ai_title,
      desc: dictionary.services_ai_desc,
      link: `/${locale}/services/ai`,
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 lg:mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-3">
            {dictionary.services_title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {dictionary.services_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((s) => (
            <Link
              key={s.key}
              href={s.link}
              className="group flex flex-col rounded-2xl bg-white p-6 border border-border shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-teal-light p-2 mb-4">
                <Image src={s.img} alt="" width={48} height={48} className="w-full h-full object-cover rounded-lg" />
              </div>
              <h3 className="font-bold text-charcoal text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-5">{s.desc}</p>
              <span className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
                <span className="inline-flex items-center gap-1">
                  {dictionary.services_learn_more}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-light" aria-hidden="true">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
