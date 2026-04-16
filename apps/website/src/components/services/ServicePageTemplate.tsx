import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ServicePageTemplateProps {
  title: string;
  desc: string;
  services: string[];
  pricing?: { service: string; price: string }[];
  pricingNote?: string;
  faqs: { q: string; a: string }[];
  ctaText: string;
  ctaLink?: string;
  badgeText?: string;
  dictionary: Dictionary;
  locale: Locale;
}

export default function ServicePageTemplate({
  title, desc, services, pricing, pricingNote, faqs, ctaText, ctaLink, badgeText, dictionary, locale,
}: ServicePageTemplateProps) {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">{title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">{desc}</p>
          {badgeText && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-teal-light border border-primary/20">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-primary text-sm font-semibold">{badgeText}</span>
            </div>
          )}
        </div>

        {/* Services List */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-charcoal mb-6">{dictionary.services_what_we_offer}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-teal-light/50 border border-border">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-charcoal text-sm font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        {pricing && pricing.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-charcoal mb-6">{dictionary.services_pricing}</h2>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {pricing.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < pricing.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-charcoal text-sm font-medium">{p.service}</span>
                  <span className="text-primary font-bold text-sm">{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pricingNote && (
          <div className="mb-12 p-6 rounded-2xl bg-teal-light border border-primary/20">
            <p className="text-muted-foreground text-sm">{pricingNote}</p>
          </div>
        )}

        {/* FAQ */}
        {faqs && faqs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-charcoal mb-6">{dictionary.services_faq_title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-charcoal font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-charcoal">
          <h3 className="text-2xl font-bold text-white mb-4">{dictionary.contact_title}</h3>
          <Link href={ctaLink || `/${locale}/contact`}>
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              {ctaText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
