import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface HeroSectionProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function HeroSection({ dictionary, locale }: HeroSectionProps) {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center">
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
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 to-charcoal/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {dictionary.hero_headline}
          </h1>
          <p className="text-lg text-white/80 font-medium mb-3">
            {dictionary.hero_sub}
          </p>
          <p className="text-white/60 text-base mb-8 leading-relaxed">
            {dictionary.hero_desc}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`/${locale}/contact`}>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-teal-dark text-white rounded-full px-6 gap-2 sm:w-auto cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                {dictionary.hero_cta1}
              </Button>
            </Link>
            <Link href={`/${locale}/services`}>
              <Button
                size="lg"
                variant="outline"
                className="w-full text-white border-white/30 hover:bg-white/10 rounded-full px-6 gap-2 sm:w-auto cursor-pointer"
              >
                {dictionary.hero_cta2}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/n400app`}>
              <Button
                size="lg"
                className="w-full bg-white/95 hover:bg-white text-purple-700 rounded-full px-6 gap-2 sm:w-auto cursor-pointer shadow-lg group"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm">
                  <span className="text-[8px] font-black leading-none">N400</span>
                </span>
                <span className="font-extrabold">N400 Ready App</span>
                <ShieldCheck className="h-4 w-4 text-purple-500 transition group-hover:scale-110" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
