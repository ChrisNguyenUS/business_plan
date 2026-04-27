import Link from "next/link";
import { Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.immigration_title, description: d.immigration_desc, alternates: { languages: { en: "/en/services/immigration", vi: "/vi/services/immigration" } } };
}

export default async function ImmigrationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const faqs = [
    { q: "Gia hạn thẻ xanh (I-90) ở Houston giá bao nhiêu? / How much is green card renewal in Houston?", a: "Manna One Solution charges competitive rates for green card renewal. Contact us for a personalized quote. USCIS fees vary by application type." },
    { q: "Đơn N-400 quốc tịch Mỹ giá bao nhiêu? / What does N-400 citizenship application cost?", a: "Our service fees vary based on the complexity of your case. We offer free consultations to provide you with a transparent quote for your citizenship application." },
    { q: "Tôi có thể được tư vấn từ xa không? / Can I get remote consultation?", a: "Yes! We serve clients remotely via secure video consultation. In-person consultations are also available at our Houston HQ on Bellaire Blvd." },
    { q: "What documents do I need for my first consultation?", a: "Bring your passport, any existing immigration documents (visa, I-94, EAD, green card), and any USCIS correspondence. We will review everything in Vietnamese or English." },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">
            Immigration Services / Dịch Vụ Di Trú
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            Professional Vietnamese-language USCIS document preparation and consultation services. 
            Bilingual support to help you navigate your immigration journey with confidence.
          </p>
          <p className="text-primary font-semibold mt-2 text-sm">
            Bắt đầu từ $50 · Tư vấn miễn phí / Starting from $50 · Free consultation
          </p>
        </div>

        {/* What We Offer */}
        {Array.isArray(d.immigration_offerings) && d.immigration_offerings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-charcoal mb-6">What We Offer / Dịch Vụ Của Chúng Tôi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {d.immigration_offerings.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-teal-light/50 border border-border">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-charcoal text-sm font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-charcoal mb-6">
            Câu Hỏi Thường Gặp / Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-charcoal font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-charcoal">
          <h3 className="text-2xl font-bold text-white mb-2">
            Đặt Lịch Tư Vấn Miễn Phí / Book Free Consultation
          </h3>
          <p className="text-white/60 text-sm mb-6">
            Contact us today to discuss your case.
          </p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              Đặt Lịch / Book Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

