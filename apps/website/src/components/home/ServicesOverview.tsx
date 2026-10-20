import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { serviceCategories } from "@/lib/services/categories";
import ServiceCategoryCard from "@/components/services/ServiceCategoryCard";

interface ServicesOverviewProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ServicesOverview({ dictionary, locale }: ServicesOverviewProps) {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {serviceCategories(dictionary, locale).map((c) => (
            <ServiceCategoryCard key={c.key} category={c} exploreLabel={dictionary.services_learn_more} />
          ))}
        </div>
      </div>
    </section>
  );
}
