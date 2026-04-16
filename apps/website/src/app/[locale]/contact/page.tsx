import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import ContactFormClient from "@/components/contact/ContactFormClient";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.contact_page_title, description: d.contact_page_desc, alternates: { languages: { en: "/en/contact", vi: "/vi/contact" } } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold text-charcoal mb-3">
            {d.contact_page_title}
          </h1>
          <p className="text-muted-foreground text-lg">{d.contact_page_desc}</p>
        </div>
        <ContactFormClient dictionary={d} locale={locale as Locale} />
      </div>
    </div>
  );
}
