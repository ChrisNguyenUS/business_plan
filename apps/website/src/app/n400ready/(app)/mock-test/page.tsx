'use client';

// Thi thử landing. Hero banner ("Thi thử như phỏng vấn thật!") + four test
// cards with thumbnails — Full Interview (featured), Civics, Speaking và
// Writing. Each card deep-links into its own immersive sub-route; the tests
// themselves live in ./full, ./civics, ./speaking and ./viet. The page title
// row comes from the shared Header (TITLES['mock-test']), so no h1 here.

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Lock,
  ShieldCheck,
  Shuffle,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import type { N400Dict } from '@/lib/n400/i18n/vi';

const THUMB_DIR = '/images/n400/Mock test thumbanil';

interface TestCard {
  slug: 'full' | 'civics' | 'speaking' | 'viet';
  image: string;
  title: string;
  desc: string;
  questions: string;
  duration: string;
  passRule: string;
  buttonClass: string;
  featured?: boolean;
}

function buildTests(dict: N400Dict): TestCard[] {
  return [
    {
      slug: 'full',
      image: `${THUMB_DIR}/fullinterview-mocktest.png`,
      title: dict.mockTest.tests.full.title,
      desc: dict.mockTest.tests.full.desc,
      questions: dict.mockTest.tests.full.questions,
      duration: dict.mockTest.tests.full.duration,
      passRule: dict.mockTest.tests.full.passRule,
      buttonClass: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
      featured: true,
    },
    {
      slug: 'civics',
      image: `${THUMB_DIR}/Civic-moctest.png`,
      title: dict.mockTest.tests.civics.title,
      desc: dict.mockTest.tests.civics.desc,
      questions: dict.mockTest.tests.civics.questions,
      duration: dict.mockTest.tests.civics.duration,
      passRule: dict.mockTest.tests.civics.passRule,
      buttonClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
    },
    {
      slug: 'speaking',
      image: `${THUMB_DIR}/Speaking-mocktest.png`,
      title: dict.mockTest.tests.speaking.title,
      desc: dict.mockTest.tests.speaking.desc,
      questions: dict.mockTest.tests.speaking.questions,
      duration: dict.mockTest.tests.speaking.duration,
      passRule: dict.mockTest.tests.speaking.passRule,
      buttonClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
    },
    {
      slug: 'viet',
      image: `${THUMB_DIR}/Writing-mocktest.png`,
      title: dict.mockTest.tests.writing.title,
      desc: dict.mockTest.tests.writing.desc,
      questions: dict.mockTest.tests.writing.questions,
      duration: dict.mockTest.tests.writing.duration,
      passRule: dict.mockTest.tests.writing.passRule,
      buttonClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
  ];
}

function CardMeta({ icon: Icon, tone, label }: { icon: LucideIcon; tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon size={12} />
      </span>
      {label}
    </span>
  );
}

export default function MockTestPickerPage() {
  const { dict } = useN400Lang();
  const base = '/n400ready/mock-test';
  const TESTS = buildTests(dict);
  const HERO_FEATURES: { icon: LucideIcon; label: string }[] = [
    { icon: Shuffle, label: dict.mockTest.hub.features.randomQuestions },
    { icon: Clock, label: dict.mockTest.hub.features.timeLimit },
    { icon: ShieldCheck, label: dict.mockTest.hub.features.uscisScoring },
    { icon: Lock, label: dict.mockTest.hub.features.noReview },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[clamp(1rem,2.5vh,1.5rem)] animate-in fade-in duration-300 pb-2 lg:h-full lg:justify-center lg:pb-0">
      {/* Hero banner — khung theo hero recipe chuẩn (docs/superpowers/specs/2026-07-16-n400-pagehero-design.md) */}
      <Card className="relative shrink-0 !overflow-hidden !p-0 border-slate-200/60">
        {/* Ảnh phủ mép phải + gradient blend trái — same recipe as ReadinessHero */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <Image
            src={`${THUMB_DIR}/Hero bar thumbnail.png`}
            alt=""
            fill
            sizes="(min-width: 1024px) 44vw, 0px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent" />
        </div>

        <div className="relative z-[1] p-[clamp(1rem,2.5vh,1.5rem)] lg:w-[56%]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 shadow-sm">
            <Star size={12} className="text-amber-400" fill="currentColor" />
            {dict.mockTest.hub.heroBadge}
          </span>
          <h2 className="mt-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(1.25rem,3vh,1.5rem)] font-extrabold leading-tight text-gray-900">
            {dict.mockTest.hub.heroTitle}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-600">
            {dict.mockTest.hub.heroSubtitle}
          </p>

          <div className="mt-[clamp(0.5rem,1.5vh,1rem)] grid grid-cols-2 gap-x-3 gap-y-2 xl:grid-cols-4">
            {HERO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-white text-teal-600 shadow-sm">
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-semibold leading-snug text-gray-700">
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-[clamp(0.75rem,2vh,1rem)] flex flex-wrap items-center gap-3">
            <Link
              href={`${base}/full`}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
            >
              {dict.mockTest.hub.heroCta}
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Clock size={14} className="text-teal-600" />
              {dict.mockTest.hub.heroDuration}
            </span>
          </div>
        </div>
      </Card>

      {/* Test picker */}
      <section className="flex flex-col min-h-0 flex-1">
        <h2 className="shrink-0 text-[clamp(1.125rem,2.5vh,1.25rem)] font-bold text-gray-800">{dict.mockTest.hub.sectionTitle}</h2>
        <div className="mt-[clamp(0.5rem,1.5vh,0.75rem)] grid grid-cols-1 gap-[clamp(0.75rem,2vh,1rem)] pb-4 sm:grid-cols-2 xl:grid-cols-4 xl:pb-0">
          {TESTS.map((t) => (
            <div
              key={t.slug}
              className={`group flex flex-col rounded-3xl border bg-white p-[clamp(0.75rem,2vh,1rem)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                t.featured
                  ? 'border-teal-300 ring-2 ring-teal-100'
                  : 'border-slate-100 hover:border-teal-200'
              }`}
            >
              <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden rounded-2xl bg-slate-50 xl:aspect-[16/9]">
                <Image
                  src={t.image}
                  alt={t.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover"
                />
                {t.featured ? (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    {dict.mockTest.hub.featuredTag}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-[clamp(0.5rem,1.5vh,0.75rem)] shrink-0 text-[clamp(0.9375rem,2vh,1rem)] font-extrabold leading-snug text-gray-800">
                {t.title}
              </h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">
                {t.desc}
              </p>
              <div className="mt-[clamp(0.5rem,1.5vh,0.75rem)] flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <CardMeta icon={ClipboardList} tone="bg-teal-50 text-teal-600" label={t.questions} />
                <CardMeta icon={Clock} tone="bg-indigo-50 text-indigo-600" label={t.duration} />
                <CardMeta icon={Star} tone="bg-amber-50 text-amber-500" label={t.passRule} />
              </div>
              <Link
                href={`${base}/${t.slug}${t.slug === 'civics' ? '?start=1' : ''}`}
                className={`mt-[clamp(0.5rem,1.5vh,0.75rem)] inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-[clamp(0.5rem,1.5vh,0.625rem)] text-[clamp(0.8125rem,1.5vh,0.875rem)] font-semibold text-white shadow-md transition-colors ${t.buttonClass}`}
              >
                {dict.common.cta.start}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
