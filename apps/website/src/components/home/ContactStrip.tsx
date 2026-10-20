import Link from "next/link";
import { Phone, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ContactStripProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ContactStrip({ dictionary, locale }: ContactStripProps) {
  return (
    <section className="relative py-16 lg:py-20 bg-teal-light border-y border-primary/20 overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4">
          {dictionary.contact_title}
        </h2>
        <p className="text-muted-foreground text-lg mb-8">{dictionary.contact_desc}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/${locale}/contact`} className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2 shadow-lg">
              <Calendar className="h-4 w-4" />
              {dictionary.hero_cta1}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href={`tel:${dictionary.contact_phone}`} className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full bg-white text-primary border-primary/30 hover:bg-primary/5 hover:text-primary rounded-full px-8 gap-2"
            >
              <Phone className="h-4 w-4" />
              {dictionary.contact_call}: {dictionary.contact_phone}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
