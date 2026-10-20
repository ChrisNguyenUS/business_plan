import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface HeroSectionProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function HeroSection({ dictionary, locale }: HeroSectionProps) {
  return (
    <section className="relative min-h-[560px] lg:min-h-[640px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={dictionary.hero_bg_image || "/images/hero-bg.jpeg"}
          alt="Manna One Solution"
          fill
          sizes="100vw"
          className="object-cover"
          priority
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/95 via-charcoal/80 to-charcoal/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            <span className="h-px w-8 bg-primary" aria-hidden="true" />
            {dictionary.hero_eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white mb-5 leading-[1.1] text-balance">
            {dictionary.hero_headline}
          </h1>
          <p className="text-lg text-white/85 leading-relaxed mb-8 max-w-xl">
            {dictionary.hero_sub}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`/${locale}/contact`}>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-teal-dark text-white rounded-full px-7 gap-2 sm:w-auto cursor-pointer shadow-lg"
              >
                <Calendar className="h-4 w-4" />
                {dictionary.hero_cta1}
              </Button>
            </Link>
            <Link href={`/${locale}/services`}>
              <Button
                size="lg"
                variant="outline"
                className="w-full bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white rounded-full px-7 gap-2 sm:w-auto cursor-pointer"
              >
                {dictionary.hero_cta2}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {/* Quieter entry point to the free N400 Ready app (keeps the acquisition path). */}
          <p className="mt-6 text-sm text-white/75">
            {dictionary.hero_n400_prefix}{" "}
            <Link href={`/${locale}/n400ready`} className="font-semibold text-white underline decoration-primary underline-offset-4 hover:decoration-white">
              N400 Ready App
            </Link>
            <ArrowRight className="ml-1 inline h-3.5 w-3.5 text-white/75" aria-hidden="true" />
          </p>
        </div>
      </div>
    </section>
  );
}
