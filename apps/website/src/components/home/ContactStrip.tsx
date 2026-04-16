import Link from "next/link";
import { Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ContactStripProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ContactStrip({ dictionary, locale }: ContactStripProps) {
  return (
    <section className="relative py-20 bg-charcoal overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          {dictionary.contact_title}
        </h2>
        <p className="text-white/60 text-lg mb-8">{dictionary.contact_desc}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={`tel:${dictionary.contact_phone}`}>
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 rounded-full px-8 gap-2"
            >
              <Phone className="h-4 w-4" />
              {dictionary.contact_phone}
            </Button>
          </a>
          <Link href={`/${locale}/contact`}>
            <Button
              size="lg"
              className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2"
            >
              <Calendar className="h-4 w-4" />
              {dictionary.hero_cta1}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
