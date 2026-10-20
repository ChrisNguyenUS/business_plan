import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/seo/alternates";
import ContactFormClient from "@/components/contact/ContactFormClient";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.contact_page_title, description: d.contact_page_desc, alternates: localeAlternates(locale as Locale, "/contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  return (
    <div className="py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 lg:mb-10">
          <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
            {d.contact_eyebrow}
            <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
          </p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-bold text-charcoal">
            {d.contact_page_title}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">{d.contact_page_desc}</p>
        </div>
        <ContactFormClient dictionary={d} locale={locale as Locale} />
      </div>
    </div>
  );
}
