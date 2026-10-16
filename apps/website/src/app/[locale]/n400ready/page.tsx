import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/config';
import { PUBLIC_COPY } from '@/lib/n400/public/copy';
import { landingJsonLd, landingMetadata } from '@/lib/n400/public/seo';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { CtaBlock } from '@/components/n400-public/CtaBlock';
import { Disclosure } from '@/components/n400-public/Disclosure';
import { FaqList } from '@/components/n400-public/FaqList';
import { ModuleList } from '@/components/n400-public/ModuleList';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return isValidLocale(locale) ? landingMetadata(locale) : {};
}

export default async function N400ReadyLandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const c = PUBLIC_COPY[locale];
  const l = c.landing;
  const linkCls = 'text-primary font-semibold hover:underline';

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(landingJsonLd(locale)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{c.home}</Link>
          <span className="mx-2">›</span>
          <span>N400 Ready</span>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{l.h1}</h1>
        <p className="text-lg text-muted-foreground mb-8">{l.lead}</p>
        <CtaBlock locale={locale} />

        <ModuleList title={l.modulesTitle} modules={l.modules} />

        <section id="personal" className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.personalTitle}</h2>
          <p className="text-muted-foreground">{l.personalBody}</p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.whichTestTitle}</h2>
          <p className="text-muted-foreground">
            {l.whichTestBody} <Link href={l.whichTestLink.href} className={linkCls}>{l.whichTestLink.label}</Link>
          </p>
          <p className="mt-3 text-muted-foreground">
            {l.seniorBody} <Link href={l.seniorLink.href} className={linkCls}>{l.seniorLink.label}</Link>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.fullListTitle}</h2>
          <p className="text-muted-foreground">
            {l.fullListBody} <Link href={l.fullListLink.href} className={linkCls}>{l.fullListLink.label}</Link>
          </p>
        </section>

        <FaqList title={l.faqTitle} items={l.faq} />
        <div className="mt-12"><CtaBlock locale={locale} /></div>
        <Disclosure text={c.disclosure} />
      </article>
    </div>
  );
}
