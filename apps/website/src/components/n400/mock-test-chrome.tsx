'use client';

/*
 * Shared "Thi thử" (Mock Test) chrome — the calm, exam-serious counterpart to
 * practice-chrome.tsx. Every mock surface (Civics / Speaking / Writing / Full
 * Interview) reuses these three pieces so all four feel like one product:
 *
 *   • MockExamProgress — one quiet card: optional Section badge · question
 *     counter · progress bar · "N Questions Remaining". No percentage, no timer
 *     estimate — remaining count is easier to read under exam pressure.
 *   • MockExamPanel — minimal right rail: one Statue illustration + one Exam
 *     Rules card. No stats / streak / tips / motivational widgets.
 *   • MockExamRulesCard — the single Exam Rules card (also shown inline on mobile).
 *
 * Design intent: Practice teaches; Mock Test performs. Nothing here explains,
 * rewards, or encourages — the only job is to answer the question, like a real
 * USCIS interview.
 */

import Image from 'next/image';
import { ClipboardCheck, ClipboardList, FileText } from 'lucide-react';
import { ProgressBar } from '@/components/n400/ui';
import { useN400Lang } from '@/lib/n400/i18n/provider';

/** Which mock surface is running — selects the matching exam-page thumbnail. */
export type MockMode = 'full' | 'civics' | 'speaking' | 'writing';

const THUMB_BASE = '/images/n400/Mock test thumbanil/mock-test-page';

/**
 * Exam-page illustrations (portrait, no-crop). Only Civics and Full Interview
 * ship a dedicated exam-page thumbnail; Speaking and Writing fall back to the
 * Full Interview scene (Statue + Capitol + flag) so the panel always shows a
 * real asset from the mock-test-page folder.
 */
const MOCK_THUMBS: Record<MockMode, { src: string; ratio: string }> = {
  full: { src: `${THUMB_BASE}/Mocktest-full interview-thumbnail.png`, ratio: '1071/1469' },
  civics: { src: `${THUMB_BASE}/Mocktest-civic-thumbnail.png`, ratio: '1078/1459' },
  speaking: { src: `${THUMB_BASE}/mocktest-speaking.png`, ratio: '1071/1469' },
  writing: { src: `${THUMB_BASE}/mocktest-writing.png`, ratio: '1071/1469' },
};

/** The four exam rules, in the reference order. English by design (chrome copy). */
const EXAM_RULES = [
  'No correct answers shown',
  'No explanations',
  'Review after finishing',
  'Simulate USCIS interview',
];

export interface MockExamSection {
  current: number;
  total: number;
  /** English section name, e.g. "Civics". */
  label: string;
  /** Vietnamese gloss shown under the label, e.g. "Kiến thức công dân". */
  labelVi?: string;
}

/**
 * The calm exam progress card. Renders the optional Section badge (Full
 * Interview only), the "Question X / Y" counter, a progress bar, and the
 * remaining-questions count. `onBack` adds a subtle leading chevron.
 */
export function MockExamProgress({
  index,
  total,
  section,
}: {
  index: number;
  total: number;
  section?: MockExamSection;
}) {
  const { lang } = useN400Lang();
  const percent = ((index + 1) / total) * 100;
  const remaining = Math.max(0, total - (index + 1));

  return (
    <div className="shrink-0 rounded-2xl border border-slate-100 bg-white px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.5rem,1.2vh,1rem)] shadow-sm">
      <div className="flex items-center gap-[clamp(0.625rem,2vw,1.5rem)]">
        {/* Left — exam icon + optional Section badge */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 lg:h-11 lg:w-11">
            <ClipboardCheck size={20} />
          </div>
          {section ? (
            <div className="min-w-0">
              <div className="text-[11px] font-medium leading-none text-gray-400">
                Section {section.current} / {section.total}
              </div>
              <div className="mt-1 font-bold leading-tight text-gray-800" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                {section.label}
              </div>
              {lang !== 'en' && section.labelVi ? (
                <div className="hidden text-[11px] leading-tight text-gray-500 sm:block">({section.labelVi})</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Middle — question counter + progress bar */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 font-bold text-gray-700" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
            Question {index + 1} / {total}
          </div>
          <ProgressBar progress={percent} heightClass="h-[clamp(6px,0.6vw,10px)]" />
        </div>

        {/* Right — remaining questions (calmer than a percentage under pressure) */}
        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-gray-500 sm:flex" style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)' }}>
          <FileText size={16} className="shrink-0" />
          <span>
            <span className="font-semibold text-gray-700">{remaining}</span> Questions Remaining
          </span>
        </div>
      </div>
    </div>
  );
}

/** The single Exam Rules card — clipboard icon, title, four teal-dot bullets. */
export function MockExamRulesCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList size={16} className="shrink-0 text-gray-600" />
        <span className="text-sm font-bold text-gray-800">Exam Rules</span>
      </div>
      <ul className="space-y-2.5">
        {EXAM_RULES.map((rule) => (
          <li key={rule} className="flex items-start gap-2.5 text-[13px] leading-snug text-gray-600">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Desktop-only right rail: one exam-page illustration + one Exam Rules card.
 * Nothing else — no stats, no streak, no tips. Mobile shows the rules card
 * inline via MockExamRulesCard.
 */
export function MockExamPanel({ mode = 'full' }: { mode?: MockMode }) {
  const thumb = MOCK_THUMBS[mode];
  return (
    <div className="hidden shrink-0 self-start lg:flex lg:w-[280px] lg:flex-col lg:gap-4 xl:w-[320px]">
      <div className="relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: thumb.ratio }}>
        <Image
          src={thumb.src}
          alt="Statue of Liberty and the U.S. Capitol"
          fill
          className="object-cover object-center"
          sizes="320px"
          priority
        />
      </div>
      <MockExamRulesCard />
    </div>
  );
}
