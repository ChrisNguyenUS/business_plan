'use client';

// Thi thử landing. Hero banner ("Thi thử như phỏng vấn thật!") + four test
// cards with thumbnails — Full Interview (featured), Civics, Speaking và
// Writing. Each card deep-links into its own immersive sub-route; the tests
// themselves live in ./full, ./civics, ./speaking and ./viet. The page title
// row comes from the shared Header (TITLES['mock-test']), so no h1 here.

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
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

const THUMB_DIR = '/images/n400/Mock test thumbanil';

const HERO_FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Shuffle, label: 'Câu hỏi ngẫu nhiên' },
  { icon: Clock, label: 'Giới hạn thời gian' },
  { icon: ShieldCheck, label: 'Chấm điểm chuẩn USCIS' },
  { icon: Lock, label: 'Không thể quay lại đáp án' },
];

interface TestCard {
  slug: 'full' | 'civics' | 'speaking' | 'viet';
  image: string;
  title: string;
  desc: string;
  questions: string;
  duration: string;
  passRule: string;
  buttonLabel: string;
  buttonClass: string;
  featured?: boolean;
}

const TESTS: TestCard[] = [
  {
    slug: 'full',
    image: `${THUMB_DIR}/fullinterview-mocktest.png`,
    title: 'Thi thử đầy đủ (Full Interview)',
    desc: 'Mô phỏng đầy đủ 3 phần: Civics, Speaking và Writing như kỳ thi thật.',
    questions: '33 câu tổng cộng',
    duration: '15–18 phút',
    passRule: 'Đạt cả 3 phần để đậu',
    buttonLabel: 'Bắt đầu ngay',
    buttonClass: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
    featured: true,
  },
  {
    slug: 'civics',
    image: `${THUMB_DIR}/Civic-moctest.png`,
    title: 'Thi thử Civics',
    desc: '20 câu hỏi trắc nghiệm về kiến thức công dân (128 câu hỏi).',
    questions: '20 câu hỏi',
    duration: '7–10 phút',
    passRule: 'Cần 60% (12/20)',
    buttonLabel: 'Bắt đầu',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
  },
  {
    slug: 'speaking',
    image: `${THUMB_DIR}/Speaking-mocktest.png`,
    title: 'Thi thử Speaking',
    desc: 'Trả lời 10 câu hỏi phỏng vấn với 5 What Mean và 5 Yes/No.',
    questions: '10 câu hỏi',
    duration: '5–7 phút',
    passRule: 'Cần 80% (8/10)',
    buttonLabel: 'Bắt đầu',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
  },
  {
    slug: 'viet',
    image: `${THUMB_DIR}/Writing-mocktest.png`,
    title: 'Thi thử Writing',
    desc: 'Viết lại 3 câu theo yêu cầu của viên chức USCIS.',
    questions: '3 câu hỏi',
    duration: '3–5 phút',
    passRule: 'Đúng 1/3 câu là đậu',
    buttonLabel: 'Bắt đầu',
    buttonClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
  },
];

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
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app/mock-test`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[clamp(1rem,2.5vh,1.5rem)] animate-in fade-in duration-300 pb-2 lg:h-full lg:justify-center lg:pb-0">
      {/* Hero banner */}
      <section className="shrink-0 overflow-hidden rounded-[24px] border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 shadow-sm">
        <div className="flex flex-col gap-[clamp(1rem,2vh,1.25rem)] p-[clamp(1rem,2.5vh,1.5rem)] lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-[clamp(1.25rem,3vh,1.5rem)] font-extrabold leading-tight text-gray-900">
              Thi thử như phỏng vấn thật!
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-600">
              Mô phỏng đầy đủ kỳ thi quốc tịch Mỹ với câu hỏi ngẫu nhiên, thời gian thực và tiêu
              chuẩn chấm điểm như USCIS.
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
                Bắt đầu thi thử đầy đủ
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 shadow-sm">
                <Clock size={14} className="text-teal-600" />
                Khoảng 15–18 phút
              </span>
            </div>
          </div>

          <div className="relative hidden w-full shrink-0 self-stretch overflow-hidden rounded-2xl lg:block lg:min-h-[140px] lg:w-[42%]">
            <Image
              src={`${THUMB_DIR}/Hero bar thumbnail.png`}
              alt="Buổi phỏng vấn quốc tịch tại văn phòng USCIS"
              fill
              sizes="(max-width: 1024px) 0px, 45vw"
              className="object-cover"
              preload
            />
          </div>
        </div>
      </section>

      {/* Test picker */}
      <section className="flex flex-col min-h-0 flex-1">
        <h2 className="shrink-0 text-[clamp(1.125rem,2.5vh,1.25rem)] font-bold text-gray-800">Chọn bài thi phù hợp với bạn</h2>
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
                    Đề xuất
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
                {t.buttonLabel}
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
