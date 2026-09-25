import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const immigrationOfferings = d.immigration_offerings ?? [];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">
            Immigration Services / Dịch Vụ Di Trú
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            {d.immigration_desc}
          </p>
          <p className="text-primary font-semibold mt-2 text-sm">
            Bắt đầu từ $50 · Tư vấn miễn phí / Starting from $50 · Free consultation
          </p>
        </div>

        {/* Featured: EB-3 */}
        <Link
          href={`/${locale}/services/immigration/eb3`}
          className="group mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-primary bg-teal-light/60 p-6 transition-colors hover:bg-teal-light"
        >
          <div>
            <span className="inline-block rounded-full bg-primary text-white text-xs font-semibold px-2.5 py-0.5 mb-2">
              {d.eb3.featured_badge}
            </span>
            <h2 className="text-xl font-bold text-charcoal mb-1">{d.eb3.featured_title}</h2>
            <p className="text-sm text-muted-foreground">{d.eb3.featured_desc}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm shrink-0">
            {d.eb3.featured_cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* What We Offer */}
        {immigrationOfferings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-charcoal mb-6">What We Offer / Dịch Vụ Của Chúng Tôi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {immigrationOfferings.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-teal-light/50 border border-border">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-charcoal text-sm font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-charcoal">
          <h3 className="text-2xl font-bold text-white mb-2">
            Đặt Lịch Hỗ Trợ Hồ Sơ / Request Filing Support
          </h3>
          <p className="text-white/60 text-sm mb-6">
            Contact us today to discuss your case.
          </p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              Đặt Lịch Hỗ Trợ Hồ Sơ / Request Filing Support
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
