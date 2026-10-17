import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/config';
import { N400_OFFICIALS_CHECKED_ON } from '@/lib/n400/state-data';
import { PUBLIC_COPY, formatCheckedOn } from '@/lib/n400/public/copy';
import { buildStatePage } from '@/lib/n400/public/state-page';
import { ALL_STATE_SLUGS, stateFromSlug } from '@/lib/n400/public/state-slugs';
import { electionNoticeActive, stateJsonLd, stateMetadata } from '@/lib/n400/public/seo';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { AnswerCard } from '@/components/n400-public/AnswerCard';
import { CtaBlock } from '@/components/n400-public/CtaBlock';
import { Disclosure } from '@/components/n400-public/Disclosure';
import { DistrictTable } from '@/components/n400-public/DistrictTable';

type Props = { params: Promise<{ locale: string; state: string }> };

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  void params;
  return ALL_STATE_SLUGS.map((state) => ({ state }));
}

async function resolve(params: Props['params']) {
  const { locale, state } = await params;
  const code = stateFromSlug(state);
  if (!isValidLocale(locale) || !code) notFound();
  return { locale, code };
}

export async function generateMetadata({ params }: Props) {
  const { locale, code } = await resolve(params);
  return stateMetadata(code, locale);
}

export default async function N400StatePage({ params }: Props) {
  const { locale, code } = await resolve(params);
  const c = PUBLIC_COPY[locale];
  const s = c.state;
  const data = buildStatePage(code, locale);
  const checked = formatCheckedOn(N400_OFFICIALS_CHECKED_ON, locale);
  const linkCls = 'text-primary font-semibold hover:underline';

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(stateJsonLd(data, locale)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{c.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/n400ready`} className="hover:text-primary">N400 Ready</Link>
          <span className="mx-2">›</span>
          <span>{data.name}</span>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{s.h1(data.name)}</h1>
        <p className="text-lg text-muted-foreground mb-8">{s.lead(data.name, checked)}</p>

        <div className="space-y-4">
          {data.answers.map((a) => (
            <div key={a.questionId}>
              <AnswerCard label={s.questionLabel(a.questionId)} a={a} />
              {a.questionId === 29 && data.districts.length > 0 && (
                <div className="mt-2 rounded-xl border border-border p-5">
                  <DistrictTable rows={data.districts} districtHeader={s.districtHeader} repHeader={s.representativeHeader} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {s.findDistrictCta}{' '}
                    <a href="https://www.house.gov/representatives/find-your-representative" className={linkCls} rel="noopener">
                      {s.houseFinderLabel}
                    </a>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {s.starNote} <Link href={s.starLink.href} className={linkCls}>{s.starLink.label}</Link>
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-charcoal mb-2">{s.dataTitle}</h2>
          <p className="text-muted-foreground">
            {s.dataChecked(checked)} {electionNoticeActive(new Date()) ? s.electionNotice : ''}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {s.sourcesLabel}:{' '}
            <a href="https://www.uscis.gov/citizenship/testupdates" className={linkCls} rel="noopener">uscis.gov/citizenship/testupdates</a>
            {' · '}
            <a href="https://www.senate.gov/senators/" className={linkCls} rel="noopener">senate.gov</a>
            {' · '}
            <a href="https://www.house.gov/representatives" className={linkCls} rel="noopener">house.gov</a>
          </p>
        </section>

        <div className="mt-12"><CtaBlock locale={locale} title={s.ctaTitle(data.name)} /></div>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-charcoal mb-3">{s.relatedTitle}</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {data.related.map((r) => (
              <li key={r.slug}><Link href={`/${locale}/n400ready/states/${r.slug}`} className={linkCls}>{r.name}</Link></li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href={`/${locale}/n400ready`} className={linkCls}>N400 Ready</Link>
            {' · '}
            <Link href={s.fullListLink.href} className={linkCls}>{s.fullListLink.label}</Link>
          </p>
        </section>

        <Disclosure text={c.disclosure} />
      </article>
    </div>
  );
}
