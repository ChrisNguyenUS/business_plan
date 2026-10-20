import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import { serviceCategories } from "@/lib/services/categories";
import ServiceCategoryCard from "@/components/services/ServiceCategoryCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.services_page_title,
    description: dictionary.services_page_subtitle,
    alternates: localeAlternates(locale as Locale, "/services"),
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCategories(dictionary, locale as Locale).map((c, i) => (
            <ServiceCategoryCard
              key={c.key}
              eager={i < 3}
              category={c}
              headingLevel="h2"
              exploreLabel={dictionary.services_explore}
              secondary={{ label: dictionary.services_cta, href: `/${locale}/contact` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
