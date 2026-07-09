'use client';

// /study — the Học tập hub (skill picker). The mobile "Học tập" tab lands
// here; each card opens one skill's hub. Card chrome mirrors the mock-test
// picker cards.

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  Landmark,
  MessageCircleQuestion,
  MessagesSquare,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';

const CIVICS_TOTAL = 128;

interface SkillCard {
  id: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  desc: string;
  done: number;
  total: number;
  unit: string;
}

export default function StudyPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const skills: SkillCard[] = [
    {
      id: 'civics',
      href: `${base}/study/civics`,
      icon: Landmark,
      tone: 'bg-teal-50 text-teal-600',
      title: 'Civics',
      desc: 'Học và ôn tập 128 câu hỏi Civics chính thức của kỳ thi quốc tịch Mỹ (N-400).',
      done: stats.distinctAnswered,
      total: CIVICS_TOTAL,
      unit: 'câu',
    },
    {
      id: 'whatmean',
      href: `${base}/speaking/what-mean`,
      icon: MessageCircleQuestion,
      tone: 'bg-purple-50 text-purple-600',
      title: 'What Mean',
      desc: 'Luyện các câu hỏi “What mean” thường gặp trong phần phỏng vấn N-400.',
      done: seen.whatmean.size,
      total: WHATMEAN_QUESTIONS.length,
      unit: 'từ',
    },
    {
      id: 'yesno',
      href: `${base}/speaking/yes-no`,
      icon: MessagesSquare,
      tone: 'bg-blue-50 text-blue-600',
      title: 'Yes / No',
      desc: 'Trả lời các câu hỏi Yes/No về bản thân, tiền án, thuế,… trong phần phỏng vấn.',
      done: seen.yesno.size,
      total: YESNO_QUESTIONS.length,
      unit: 'câu',
    },
    {
      id: 'writing',
      href: `${base}/writing`,
      icon: PenLine,
      tone: 'bg-orange-50 text-orange-500',
      title: 'Writing',
      desc: 'Luyện phần thi viết N-400: nghe và gõ lại câu đúng chính tả.',
      done: seen.writing.size,
      total: WRITING_SENTENCES.length,
      unit: 'bài',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-300">
      <h1 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">Chọn kỹ năng bạn muốn học</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {skills.map((s) => {
          const Icon = s.icon;
          const percent = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
          return (
            <Link
              key={s.id}
              href={s.href}
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.tone}`}>
                <Icon size={24} />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-gray-800">{s.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">{s.desc}</p>
              <div className="mt-4 text-sm text-gray-600">
                Đã học: <span className="font-bold text-gray-900">{s.done}</span> / {s.total} {s.unit}
              </div>
              <div className="mt-2">
                <ProgressBar progress={percent} />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 transition-colors group-hover:text-teal-700">
                Bắt đầu học
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
