import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import HeroSection from "@/components/home/HeroSection";
import ServicesOverview from "@/components/home/ServicesOverview";
import WhyManna from "@/components/home/WhyManna";
import HowItWorks from "@/components/home/HowItWorks";
import ContactStrip from "@/components/home/ContactStrip";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: locale === "vi"
      ? "Manna One Solution — Một Nơi, Mọi Giải Pháp"
      : "Manna One Solution — One Stop, All Solutions",
    description: dictionary.hero_desc,
    alternates: {
      languages: {
        en: "/en",
        vi: "/vi",
      },
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

  return (
    <>
      <HeroSection dictionary={dictionary} locale={locale as Locale} />
      <ServicesOverview dictionary={dictionary} locale={locale as Locale} />
      <WhyManna dictionary={dictionary} />
      <HowItWorks dictionary={dictionary} />
      <ContactStrip dictionary={dictionary} locale={locale as Locale} />
    </>
  );
}
