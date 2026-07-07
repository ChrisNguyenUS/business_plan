'use client';

// Thi thử picker. The single mock exam was split into three focused tests —
// Civics (128-câu), Viết (dictation), and Speaking (What Mean + Yes/No). This
// landing lets the learner pick which one to sit. Each card deep-links into its
// own immersive sub-route; the tests themselves live in ./civics, ./viet and
// ./speaking.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpenCheck,
  PenLine,
  Mic,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface TestCard {
  slug: 'civics' | 'viet' | 'speaking';
  emoji: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string; // icon tile bg + text
}

const TESTS: TestCard[] = [
  {
    slug: 'civics',
    emoji: '📚',
    icon: BookOpenCheck,
    title: 'Thi thử Civics',
    desc: '128 câu hỏi — 20 câu ngẫu nhiên, vượt qua 12 câu là đạt',
    accent: 'bg-teal-50 text-teal-600',
  },
  {
    slug: 'viet',
    emoji: '✍️',
    icon: PenLine,
    title: 'Thi thử Viết',
    desc: '3 câu viết — viết đúng ít nhất 1 câu là đạt',
    accent: 'bg-orange-50 text-orange-500',
  },
  {
    slug: 'speaking',
    emoji: '🎤',
    icon: Mic,
    title: 'Thi thử Speaking',
    desc: '10 câu (5 What Mean + 5 Yes No) — trả lời đúng ít nhất 8 câu là đạt',
    accent: 'bg-purple-50 text-purple-600',
  },
];

export default function MockTestPickerPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-300">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Chọn bài thi thử</h1>
        <p className="mt-1.5 text-sm text-gray-500 sm:text-base">
          Mô phỏng kỳ thi quốc tịch Mỹ (N-400). Chọn phần bạn muốn luyện thi hôm nay.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {TESTS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.slug}
              href={`/${locale}/n400app/mock-test/${t.slug}`}
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${t.accent}`}
              >
                <span aria-hidden>{t.emoji}</span>
              </div>
              <h2 className="mt-5 flex items-center gap-2 text-xl font-extrabold text-gray-800">
                <Icon size={20} className="shrink-0 text-teal-600" />
                {t.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{t.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 transition-colors group-hover:text-teal-700">
                Bắt đầu
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
