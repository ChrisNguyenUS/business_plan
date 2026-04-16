import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ServicesOverviewProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ServicesOverview({ dictionary, locale }: ServicesOverviewProps) {
  const services = [
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
      key: "immigration",
      img: "/images/service-immigration.png",
      title: dictionary.services_immigration_title,
      desc: dictionary.services_immigration_desc,
      link: `/${locale}/services/immigration`,
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
    <section className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-3">
            {dictionary.services_title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {dictionary.services_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div
              key={s.key}
              className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-teal-light p-2 mb-4">
                <Image
                  src={s.img}
                  alt={s.title}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <h3 className="font-bold text-charcoal text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {s.desc}
              </p>
              <Link href={s.link}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-teal-dark p-0 gap-1"
                >
                  {dictionary.services_learn_more}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
