import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ExternalLink,
  FileClock,
  Gift,
  Languages,
  LogIn,
  MessagesSquare,
  Mic,
  MonitorSmartphone,
  PenLine,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { isValidLocale } from '@/lib/i18n/config';
import { PUBLIC_COPY, ctaHref, type ExamCard, type ModuleIcon } from '@/lib/n400/public/copy';
import { landingJsonLd, landingMetadata } from '@/lib/n400/public/seo';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { Disclosure } from '@/components/n400-public/Disclosure';
import { FaqList } from '@/components/n400-public/FaqList';
import { StatePicker, type PickerState } from '@/components/n400-public/StatePicker';
import { STATES, type StateCode } from '@/lib/n400/state-data';
import { buildStatePage } from '@/lib/n400/public/state-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return isValidLocale(locale) ? landingMetadata(locale) : {};
}

const MODULE_ICONS: Record<ModuleIcon, LucideIcon> = {
  civics: BookOpen,
  yesno: MessagesSquare,
  writing: PenLine,
  speaking: Mic,
};
const TRUST_ICONS: LucideIcon[] = [Gift, Languages, MonitorSmartphone, ShieldCheck];
const EXAM_STYLE: Record<ExamCard['tone'], { icon: LucideIcon; tile: string; badge: string }> = {
  current: { icon: CalendarCheck, tile: 'bg-teal-light text-primary', badge: 'bg-primary/10 text-teal-dark' },
  past: { icon: FileClock, tile: 'bg-[#F5F7F9] text-muted-foreground', badge: 'bg-[#F5F7F9] text-muted-foreground' },
  special: { icon: UserRound, tile: 'bg-[#FBF3E3] text-[#A86B0C]', badge: 'bg-[#FBF3E3] text-[#8A5A0B]' },
};
// Largest Vietnamese-American communities first, then everything else by name.
const POPULAR: StateCode[] = ['TX', 'CA', 'FL', 'NY', 'WA', 'IL', 'GA', 'NC', 'VA', 'MA', 'AZ', 'CO', 'OR', 'NV', 'OH', 'PA'];

const isExternal = (href: string) => href.startsWith('http');

export default async function N400ReadyLandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const c = PUBLIC_COPY[locale];
  const l = c.landing;
  const start = ctaHref(locale);

  const byName = (a: StateCode, b: StateCode) => {
    const n = (code: StateCode) => STATES.find((s) => s.code === code)!;
    return (locale === 'vi' ? n(a).nameVi : n(a).nameEn).localeCompare(locale === 'vi' ? n(b).nameVi : n(b).nameEn);
  };
  const order = [...POPULAR, ...STATES.map((s) => s.code).filter((code) => !POPULAR.includes(code)).sort(byName)];
  const pickerStates: PickerState[] = order.map((code) => {
    const page = buildStatePage(code, locale);
    const info = STATES.find((s) => s.code === code)!;
    return {
      slug: page.slug,
      name: page.name,
      alt: locale === 'vi' ? info.nameEn : info.nameVi,
      answers: page.answers.map((a) => ({
        label: c.state.questionLabel(a.questionId),
        question: a.question,
        answers: a.answers,
        note: a.questionId === 29 && a.answers.length === 0 ? l.statesQ29 : a.note,
      })),
    };
  });

  const primaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
  const textLink = 'inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(landingJsonLd(locale)) }} />

      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-br from-[#D7EDE9] via-[#EEF6F3] to-[#F6EFE3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pb-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href={`/${locale}`} className="hover:text-primary">{c.home}</Link>
            <span className="mx-2" aria-hidden="true">›</span>
            <span>N400 Ready</span>
          </nav>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{l.eyebrow}</p>
              <h1 className="mt-3 text-4xl lg:text-5xl font-bold leading-tight text-charcoal">{l.h1}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{l.lead}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={start} className={`${primaryBtn} px-7 py-3.5 text-base`}>
                  {c.ctaPrimary}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={start} className={secondaryBtn}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {c.ctaSecondary}
                </Link>
              </div>
            </div>

            {/* Real app screens */}
            <div className="relative mx-auto h-[400px] w-full max-w-[420px] sm:h-[460px]" role="img" aria-label={l.heroImageAlt}>
              <div className="absolute right-0 top-8 hidden w-[190px] rotate-3 overflow-hidden rounded-[1.75rem] border-[6px] border-charcoal bg-white shadow-xl sm:block">
                <Image src="/images/n400/public/app-practice-speak.webp" alt="" width={480} height={863} loading="eager" sizes="190px" className="h-auto w-full" />
              </div>
              <div className="absolute left-1/2 top-0 w-[210px] -translate-x-1/2 overflow-hidden rounded-[1.75rem] border-[6px] border-charcoal bg-white shadow-2xl sm:left-4 sm:translate-x-0 sm:w-[230px]">
                <Image src="/images/n400/public/app-study-hub.webp" alt="" width={480} height={863} priority sizes="230px" className="h-auto w-full" />
              </div>
            </div>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {l.trust.map((t, i) => {
              const Icon = TRUST_ICONS[i] ?? ShieldCheck;
              return (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-charcoal">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {t}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 space-y-16 lg:space-y-20">
        {/* What you can practice */}
        <section>
          <h2 className="text-2xl lg:text-3xl font-bold text-charcoal">{l.modulesTitle}</h2>
          <p className="mt-2 text-muted-foreground">{l.modulesSub}</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {l.modules.map((m) => {
              const Icon = MODULE_ICONS[m.icon];
              return (
                <li key={m.title}>
                  <Link
                    href={start}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-light text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-charcoal text-lg">{m.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
                    <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {l.moduleCta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Which test */}
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-charcoal">{l.examTitle}</h2>
              <p className="mt-2 text-muted-foreground">{l.examBody}</p>
            </div>
            <a href={l.examSource.href} target="_blank" rel="noopener noreferrer" className={textLink}>
              {l.examSource.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {l.exams.map((e) => {
              const st = EXAM_STYLE[e.tone];
              const Icon = st.icon;
              const ext = isExternal(e.link.href);
              return (
                <li key={e.title} className="flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${st.tile}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-charcoal text-lg leading-snug">{e.title}</h3>
                      <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}>{e.badge}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                  <div className="mt-auto pt-4">
                    {ext ? (
                      <a href={e.link.href} target="_blank" rel="noopener noreferrer" className={textLink}>
                        {e.link.label}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link href={e.link.href} className={textLink}>
                        {e.link.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Answers for where you live */}
        <section id="states">
          <h2 className="text-2xl lg:text-3xl font-bold text-charcoal">{l.personalTitle}</h2>
          <p className="mt-2 mb-6 max-w-3xl text-muted-foreground">{l.personalBody}</p>
          <StatePicker
            locale={locale}
            states={pickerStates}
            defaultSlug="texas"
            labels={{
              search: l.statesSearchLabel,
              empty: l.statesEmpty('{q}'),
              showAll: l.statesShowAll(0).replace('0', '{n}'),
              showLess: l.statesShowLess,
              previewLink: l.statePreviewLink('{name}'),
            }}
          />
        </section>

        {/* Full list of 128 */}
        <section className="grid gap-6 rounded-2xl bg-[#F6EFE3]/70 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_340px] lg:items-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-3xl font-bold text-primary shadow-sm" aria-hidden="true">
            128
          </span>
          <div>
            <h2 className="text-2xl font-bold text-charcoal">{l.fullListTitle}</h2>
            <p className="mt-2 text-muted-foreground">{l.fullListBody}</p>
            {isExternal(l.fullListLink.href) ? (
              <a href={l.fullListLink.href} target="_blank" rel="noopener noreferrer" className={`${primaryBtn} mt-5`}>
                {l.fullListLink.label}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <Link href={l.fullListLink.href} className={`${primaryBtn} mt-5`}>
                {l.fullListLink.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-[#E8A838]/30 bg-white p-4">
            <p className="text-sm font-semibold text-charcoal">{l.fullListSourceTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.fullListSourceBody}</p>
            <a href={l.fullListSourceLink.href} target="_blank" rel="noopener noreferrer" className={`${textLink} mt-2`}>
              {l.fullListSourceLink.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>

        <FaqList title={l.faqTitle} items={l.faq} />

        {/* Final CTA */}
        <section>
          <div className="flex flex-col gap-6 rounded-2xl border border-primary/20 bg-[#D7EDE9]/60 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-charcoal">{l.finalTitle}</h2>
              <p className="mt-2 text-muted-foreground">{l.finalBody}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Link href={start} className={primaryBtn}>
                {c.ctaPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={start} className={secondaryBtn}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {l.signIn}
              </Link>
            </div>
          </div>
          <Disclosure text={c.disclosure} />
        </section>
      </div>
    </div>
  );
}
