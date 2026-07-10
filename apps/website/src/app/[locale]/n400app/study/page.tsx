'use client';

// /study — the Học tập hub (skill picker). Both the desktop "Học tập" nav
// item and the mobile tab land here. Layout follows the IA redesign mock:
//   1. Overall-progress hero (ring + next question + Đã học/Đã lưu/Độ chính xác)
//   2. Four skill cards with thumbnails — each "Học ngay" opens one skill's
//      hub (the hub screens themselves are unchanged)
//   3. Study-tip strip

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Star,
} from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';

const CIVICS_TOTAL = 128;

interface SkillCard {
  id: string;
  href: string;
  image: string;
  title: string;
  desc: string;
  done: number;
  total: number;
  barClass: string;
  buttonClass: string;
}

function ProgressRing({ percent }: { percent: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="9" className="text-gray-100" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - percent / 100)}
          className="text-teal-600 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-teal-700">
        <GraduationCap size={30} />
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-base font-extrabold leading-tight text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);
  const attempted = useMemo(() => new Set(state.attempts.map((a) => a.questionId)), [state.attempts]);
  const civics = useMemo(
    () => deriveHubProgress(N400_QUESTIONS, (q) => attempted.has(q.id), (q) => q.id),
    [attempted],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const skills: SkillCard[] = [
    {
      id: 'civics',
      href: `${base}/study/civics`,
      image: '/images/n400/civic-thumbnail-study.png',
      title: 'Civic 128 câu',
      desc: 'Học toàn bộ 128 câu hỏi Civics theo thứ tự.',
      done: stats.distinctAnswered,
      total: CIVICS_TOTAL,
      barClass: 'bg-teal-600',
      buttonClass: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
    },
    {
      id: 'whatmean',
      href: `${base}/speaking/what-mean`,
      image: '/images/n400/whatmean-thumbnail-study.png',
      title: 'What Mean',
      desc: 'Học và hiểu ý nghĩa của các từ và cụm từ quan trọng.',
      done: seen.whatmean.size,
      total: WHATMEAN_QUESTIONS.length,
      barClass: 'bg-blue-600',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
    },
    {
      id: 'yesno',
      href: `${base}/speaking/yes-no`,
      image: '/images/n400/yesno-thumbnail-study.png',
      title: 'Yes No',
      desc: 'Luyện tập trả lời các câu hỏi Yes / No.',
      done: seen.yesno.size,
      total: YESNO_QUESTIONS.length,
      barClass: 'bg-purple-600',
      buttonClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
    },
    {
      id: 'writing',
      href: `${base}/writing`,
      image: '/images/n400/writing-thumbnail-study.png',
      title: 'Writing',
      desc: 'Luyện viết chính tả và viết hoa, dấu chấm.',
      done: seen.writing.size,
      total: WRITING_SENTENCES.length,
      barClass: 'bg-orange-500',
      buttonClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8 animate-in fade-in duration-300">
      {/* Overall progress hero */}
      <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="flex shrink-0 items-center gap-5">
            <div className="text-center lg:text-left">
              <div className="text-sm text-gray-500">Tiến độ tổng thể</div>
              <div className="mt-1 text-3xl font-extrabold leading-none text-gray-900">
                {stats.distinctAnswered}
                <span className="text-lg font-bold text-gray-400">/{CIVICS_TOTAL}</span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-gray-500">câu</div>
              <div className="mt-2 text-sm font-bold text-teal-600">{stats.coverage}% hoàn thành</div>
            </div>
            <ProgressRing percent={stats.coverage} />
          </div>

          <div className="min-w-0 flex-1 lg:border-l lg:border-gray-100 lg:pl-6">
            <h2 className="text-lg font-extrabold text-gray-900">
              {civics.nextNumber !== null
                ? `Bạn đang ở câu #${civics.nextNumber}`
                : `Bạn đã học qua cả ${CIVICS_TOTAL} câu — ôn lại nhé!`}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">Học đều mỗi ngày để đạt 100% nhé!</p>
            <div className="mt-3">
              <ProgressBar progress={stats.coverage} heightClass="h-2.5" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <HeroStat
                icon={<CheckCircle2 size={18} />}
                tone="bg-teal-50 text-teal-600"
                value={`${stats.distinctAnswered}`}
                label="Đã học"
              />
              <div className="hidden h-8 border-l border-gray-100 sm:block" />
              <HeroStat
                icon={<BookMarked size={18} />}
                tone="bg-indigo-50 text-indigo-600"
                value={`${state.bookmarks.length}`}
                label="Đã lưu"
              />
              <div className="hidden h-8 border-l border-gray-100 sm:block" />
              <HeroStat
                icon={<Star size={18} />}
                tone="bg-orange-50 text-orange-500"
                value={`${stats.accuracy}%`}
                label="Độ chính xác"
              />
            </div>
          </div>

          <div className="relative hidden h-40 w-64 shrink-0 self-stretch xl:block">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt=""
              fill
              sizes="256px"
              className="rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Skill picker */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 sm:text-xl">Chọn kỹ năng để học</h2>
        <p className="mt-0.5 text-sm text-gray-500">Học {CIVICS_TOTAL} câu hỏi Civics theo 4 kỹ năng chính</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {skills.map((s) => {
            const percent = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
            return (
              <div
                key={s.id}
                className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-50">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-gray-800">{s.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">{s.desc}</p>
                <div className="mt-4 text-sm font-semibold text-gray-700">
                  {s.done}/{s.total} câu
                </div>
                <div className="mt-2">
                  <ProgressBar progress={percent} colorClass={s.barClass} />
                </div>
                <Link
                  href={s.href}
                  className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors ${s.buttonClass}`}
                >
                  Học ngay
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Study tip */}
      <section className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <Lightbulb size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-extrabold text-gray-900">Gợi ý học tập</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
            Hãy học đều mỗi ngày. 15–20 phút mỗi ngày sẽ giúp bạn ghi nhớ lâu hơn và tự tin hơn trong kỳ thi!
          </p>
        </div>
      </section>
    </div>
  );
}
