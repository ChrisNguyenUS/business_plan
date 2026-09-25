import { CheckCircle, MapPin, Plane } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import Eb3MessengerButton from "@/components/services/Eb3MessengerButton";
import Eb3ScreeningForm from "@/components/services/Eb3ScreeningForm";

const PATH = "/services/immigration/eb3";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { eb3 } = await getDictionary(locale as Locale);
  return {
    title: eb3.meta_title,
    description: eb3.meta_desc,
    alternates: { languages: { en: `/en${PATH}`, vi: `/vi${PATH}` } },
  };
}

export default async function Eb3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { eb3 } = await getDictionary(locale as Locale);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: eb3.hero_title,
      description: eb3.meta_desc,
      serviceType: "EB-3 Other Workers immigration case support",
      provider: { "@type": "Organization", name: "MannaOS", url: "https://mannaos.com" },
      areaServed: [
        { "@type": "Country", name: "Vietnam" },
        { "@type": "Country", name: "United States" },
      ],
      url: `https://mannaos.com/${locale}${PATH}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: eb3.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* 1. Hero */}
        <section>
          <span className="inline-block rounded-full bg-teal-light text-primary text-xs font-semibold px-3 py-1 mb-4">
            {eb3.hero_eyebrow}
          </span>
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">{eb3.hero_title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-8">{eb3.hero_sub}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Eb3MessengerButton label={eb3.cta_messenger} />
            <a
              href="#eb3-check"
              className="inline-flex items-center justify-center rounded-full px-6 h-11 text-sm font-semibold border border-primary text-primary hover:bg-teal-light transition-colors"
            >
              {eb3.cta_check}
            </a>
          </div>
        </section>

        {/* 2. What is EB-3 */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{eb3.what_title}</h2>
          <p className="text-muted-foreground mb-6">{eb3.what_intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {eb3.categories.map((c, i) => {
              const highlight = i === eb3.categories.length - 1;
              return (
                <div
                  key={c.title}
                  className={`p-5 rounded-xl border ${highlight ? "border-primary bg-teal-light/50" : "border-border"}`}
                >
                  <h3 className="font-semibold text-charcoal mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Where are you */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.where_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border">
              <Plane className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold text-charcoal mb-1">🇻🇳 {eb3.where_vn_title}</h3>
              <p className="text-sm text-muted-foreground">{eb3.where_vn_desc}</p>
            </div>
            <div className="p-5 rounded-xl border border-border">
              <MapPin className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold text-charcoal mb-1">🇺🇸 {eb3.where_us_title}</h3>
              <p className="text-sm text-muted-foreground">{eb3.where_us_desc}</p>
            </div>
          </div>
        </section>

        {/* 4. Steps */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.steps_title}</h2>
          <ol className="space-y-4">
            {eb3.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-charcoal">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground mt-6 p-4 rounded-lg bg-muted/50">{eb3.steps_note}</p>
        </section>

        {/* 5. Who fits */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.fit_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: eb3.fit_industries_title, items: eb3.fit_industries },
              { title: eb3.fit_requirements_title, items: eb3.fit_requirements },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-charcoal mb-3">{group.title}</h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-charcoal">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Cost structure */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{eb3.cost_title}</h2>
          <p className="text-muted-foreground mb-6">{eb3.cost_intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {eb3.cost_items.map((c) => (
              <div key={c.title} className="p-5 rounded-xl bg-teal-light/50 border border-border">
                <h3 className="font-semibold text-charcoal mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
          <Eb3MessengerButton label={eb3.cost_cta} />
        </section>

        {/* 7. Screening form */}
        <section id="eb3-check" className="scroll-mt-24 bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-charcoal mb-1">{eb3.form.title}</h2>
          <p className="text-muted-foreground text-sm mb-6">{eb3.form.sub}</p>
          <Eb3ScreeningForm copy={eb3.form} locale={locale as Locale} />
        </section>

        {/* 8. FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.faq_title}</h2>
          <div className="space-y-3">
            {eb3.faq.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border p-4">
                <summary className="cursor-pointer font-medium text-charcoal list-none flex justify-between gap-4">
                  {f.q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Disclaimer */}
        <p className="text-xs text-muted-foreground border-t border-border pt-6">{eb3.disclaimer}</p>
      </div>
    </div>
  );
}
