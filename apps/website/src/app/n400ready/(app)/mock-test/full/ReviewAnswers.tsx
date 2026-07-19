'use client';

// ReviewAnswers — dedicated review screen for the Full Interview. One filterable
// list over all three sections (Tất cả / Câu sai / Câu đúng + per-part filter):
// each row shows the question, the learner's answer, the correct answer and the
// Vietnamese gloss; Writing rows add the per-word diff so mistakes are visible.

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { WordDiff } from '@/components/n400/ui/WordDiff';
import { useN400UserState } from '@/lib/n400/user-state';
import { N400_QUESTIONS_BY_ID, N400_CATEGORY_LABELS } from '@/lib/n400/questions-data';
import { questionAudioUrl } from '@/lib/n400/quiz-engine';
import { gradeWritingSentence } from '@/lib/n400/writing-grader';
import type { WritingSentence } from '@/lib/n400/writing-data';
import type { MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

export interface CivicsAnswer {
  questionId: number;
  wasCorrect: boolean;
  /** English text of the option the learner picked. */
  selectedEn?: string;
}

export interface SpeakingAnswer {
  itemId: string;
  wasCorrect: boolean;
  selectedEn?: string;
}

export interface WritingAnswer {
  sentenceId: string;
  correct: boolean;
  userInput: string;
}

interface PartResult {
  correct: number;
  total: number;
  passed: boolean;
}

interface ReviewAnswersProps {
  civicsAnswers: CivicsAnswer[];
  speakingQuestions: MCQuestion[];
  speakingAnswers: SpeakingAnswer[];
  writingQuestions: WritingSentence[];
  writingAnswers: WritingAnswer[];
  civics: PartResult | null;
  speaking: PartResult | null;
  writing: PartResult | null;
  totalScore: number;
  totalQuestions: number;
  overall: boolean;
  onBack: () => void;
  onRetake: () => void;
}

type SectionKey = 'civics' | 'speaking' | 'writing';
type StatusFilter = 'all' | 'wrong' | 'correct';
type SectionFilter = 'all' | SectionKey;

interface ReviewItem {
  key: string;
  section: SectionKey;
  badge: string;
  promptEn: string;
  promptVi?: string;
  userAnswer: string | null;
  correct: { en: string; vi?: string }[];
  ok: boolean;
  audioSrc?: string | null;
  bookmarkId?: number;
  /** Writing only — user input diffed against the canonical sentence. */
  writingDiff?: { userInput: string; sentenceEn: string };
}

/** Icon + label per section, built from the dict so labels follow the locale. */
function sectionMeta(rt: {
  civicsSection: string;
  speakingSection: string;
  writingSection: string;
}): Record<SectionKey, { icon: string; label: string }> {
  return {
    civics: { icon: '🏛', label: rt.civicsSection },
    speaking: { icon: '💬', label: rt.speakingSection },
    writing: { icon: '✍️', label: rt.writingSection },
  };
}

function sectionFilters(rt: {
  allSections: string;
  civicsOption: string;
  speakingOption: string;
  writingOption: string;
}): { id: SectionFilter; label: string }[] {
  return [
    { id: 'all', label: rt.allSections },
    { id: 'civics', label: rt.civicsOption },
    { id: 'speaking', label: rt.speakingOption },
    { id: 'writing', label: rt.writingOption },
  ];
}

export default function ReviewAnswers({
  civicsAnswers,
  speakingQuestions,
  speakingAnswers,
  writingQuestions,
  writingAnswers,
  civics,
  speaking,
  writing,
  totalScore,
  totalQuestions,
  overall,
  onBack,
  onRetake,
}: ReviewAnswersProps) {
  const { state, toggleBookmark } = useN400UserState();
  const { dict, lang } = useN400Lang();
  const rt = dict.mockTest.review;
  const SECTION_META = sectionMeta(rt);
  const SECTION_FILTERS = sectionFilters(rt);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');

  const items = useMemo<ReviewItem[]>(() => {
    const civicsItems = civicsAnswers.flatMap((a): ReviewItem[] => {
      const q = N400_QUESTIONS_BY_ID.get(a.questionId);
      if (!q) return [];
      const categoryLabel = N400_CATEGORY_LABELS[q.category];
      const categoryName = (lang === 'en' ? categoryLabel?.en : categoryLabel?.vi) ?? q.category;
      return [
        {
          key: `civ-${a.questionId}`,
          section: 'civics',
          badge: tFormat(rt.civicsBadge, { category: categoryName, id: q.id }),
          promptEn: q.questionEn,
          promptVi: q.questionVi,
          userAnswer: a.selectedEn ?? null,
          correct: q.answersEn.map((en, i) => ({ en, vi: q.answersVi[i] })),
          ok: a.wasCorrect,
          audioSrc: questionAudioUrl(q.id),
          bookmarkId: q.id,
        },
      ];
    });

    const speakingById = new Map(speakingQuestions.map((q) => [q.itemId, q]));
    const speakingItems = speakingAnswers.flatMap((a): ReviewItem[] => {
      const q = speakingById.get(a.itemId);
      if (!q) return [];
      return [
        {
          key: `sp-${a.itemId}`,
          section: 'speaking',
          badge: q.badge,
          promptEn: q.headerEn,
          promptVi: q.headerVi,
          userAnswer: a.selectedEn ?? null,
          correct: q.accepted,
          ok: a.wasCorrect,
          audioSrc: q.questionAudioSrc,
        },
      ];
    });

    const writingById = new Map(writingQuestions.map((q) => [q.id, q]));
    const writingItems = writingAnswers.flatMap((a): ReviewItem[] => {
      const q = writingById.get(a.sentenceId);
      if (!q) return [];
      return [
        {
          key: `wr-${a.sentenceId}`,
          section: 'writing',
          badge: `Writing · ${q.topicVi}`,
          promptEn: rt.writingPrompt,
          userAnswer: a.userInput || null,
          correct: [{ en: q.sentenceEn, vi: q.sentenceVi }],
          ok: a.correct,
          writingDiff: a.correct ? undefined : { userInput: a.userInput, sentenceEn: q.sentenceEn },
        },
      ];
    });

    return [...civicsItems, ...speakingItems, ...writingItems];
  }, [civicsAnswers, speakingQuestions, speakingAnswers, writingQuestions, writingAnswers, rt, lang]);

  // Pill counts follow the active section filter so they always describe
  // what the pill would show, not the whole test.
  const sectionItems =
    sectionFilter === 'all' ? items : items.filter((it) => it.section === sectionFilter);
  const wrongCount = sectionItems.filter((it) => !it.ok).length;
  const correctCount = sectionItems.length - wrongCount;

  const visible = sectionItems.filter((it) => {
    if (statusFilter === 'wrong' && it.ok) return false;
    if (statusFilter === 'correct' && !it.ok) return false;
    return true;
  });

  const summaryCells: { icon: string; label: string; result: PartResult | null }[] = [
    {
      icon: '📋',
      label: rt.fullInterview,
      result: { correct: totalScore, total: totalQuestions, passed: overall },
    },
    { icon: SECTION_META.civics.icon, label: SECTION_META.civics.label, result: civics },
    { icon: SECTION_META.speaking.icon, label: SECTION_META.speaking.label, result: speaking },
    { icon: SECTION_META.writing.icon, label: SECTION_META.writing.label, result: writing },
  ];

  const statusPills: { id: StatusFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: tFormat(rt.allQuestions, { count: sectionItems.length }) },
    {
      id: 'wrong',
      label: tFormat(rt.wrongQuestions, { count: wrongCount }),
      icon: <XCircle size={15} className="shrink-0 text-red-400" />,
    },
    {
      id: 'correct',
      label: tFormat(rt.correctQuestions, { count: correctCount }),
      icon: <CheckCircle size={15} className="shrink-0 text-teal-500" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-8 animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> {rt.back}
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RotateCcw size={14} /> {dict.mockTest.result.retakeButton}
        </button>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-gray-900">{rt.title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{rt.subtitle}</p>
      </div>

      {/* Summary strip — overall + one cell per part */}
      <Card className="grid grid-cols-2 gap-y-4 p-4 sm:p-5 lg:grid-cols-4">
        {summaryCells.map(({ icon, label, result }) => (
          <div key={label} className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xl"
              aria-hidden
            >
              {icon}
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-gray-500">{label}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-lg font-extrabold text-gray-900">
                  {result?.correct ?? 0}
                  <span className="text-sm font-bold text-gray-400">/{result?.total ?? 0}</span>
                </span>
                <PassBadge passed={!!result?.passed} />
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              aria-pressed={statusFilter === pill.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                statusFilter === pill.id
                  ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {statusFilter === pill.id ? null : pill.icon}
              {pill.label}
            </button>
          ))}
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
          aria-label={rt.filterLabel}
          className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 outline-none transition-colors hover:border-teal-300 focus:border-teal-400"
        >
          {SECTION_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-gray-500">
            {dict.mockTest.result.noMatches}
          </div>
        ) : null}
        {visible.map((item) => (
          <Card key={item.key} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  {item.badge}
                </span>
                <h3 className="mt-2.5 text-[0.9375rem] font-bold leading-snug text-gray-800">
                  {item.promptEn}
                </h3>
                {lang !== 'en' && item.promptVi ? (
                  <p className="mt-0.5 text-[0.8125rem] text-gray-500">{item.promptVi}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {item.audioSrc !== undefined ? (
                  <AudioButton src={item.audioSrc} size="sm" label={dict.flashcards.listenQuestion} />
                ) : null}
                {item.bookmarkId != null ? (
                  <button
                    type="button"
                    onClick={() => toggleBookmark(item.bookmarkId!)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      state.bookmarks.includes(item.bookmarkId)
                        ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-teal-500'
                    }`}
                    aria-label={
                      state.bookmarks.includes(item.bookmarkId)
                        ? dict.flashcards.unbookmark
                        : dict.mockTest.result.bookmarkHint
                    }
                  >
                    <Bookmark
                      size={16}
                      fill={state.bookmarks.includes(item.bookmarkId) ? 'currentColor' : 'none'}
                    />
                  </button>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    item.ok ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {item.ok ? dict.mockTest.result.filterCorrect : dict.mockTest.result.filterWrong}
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {/* Learner's answer */}
              <div
                className={`rounded-xl border p-3 ${
                  item.ok ? 'border-teal-200 bg-teal-50/50' : 'border-orange-200 bg-orange-50/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {item.ok ? (
                    <CheckCircle size={14} className="shrink-0 text-teal-600" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-orange-500" />
                  )}
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      item.ok ? 'text-teal-700' : 'text-orange-600'
                    }`}
                  >
                    {item.section === 'writing' ? rt.yourAnswer : rt.yourSelection}
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm font-medium ${
                    item.ok ? 'text-teal-800' : 'text-orange-800'
                  }`}
                >
                  {item.userAnswer ?? rt.noSelection}
                </p>
                {item.writingDiff ? (
                  <div className="mt-2">
                    <WordDiff
                      wordResults={
                        gradeWritingSentence(
                          item.writingDiff.userInput,
                          item.writingDiff.sentenceEn,
                          dict,
                        ).wordResults
                      }
                      showAnnotations={false}
                    />
                  </div>
                ) : null}
              </div>

              {/* Correct / expected answer — skipped for correct Writing rows where
                  the learner's sentence already IS the canonical sentence. */}
              {!(item.ok && item.section === 'writing') ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="shrink-0 text-teal-600" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                      {item.section === 'writing'
                        ? rt.rightAnswer
                        : item.section === 'speaking'
                          ? rt.expectedAnswer
                          : rt.correctAnswer}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {item.correct.map((ans, i) => (
                      <p key={i} className="text-sm font-medium text-teal-800">
                        {ans.en}
                        {lang !== 'en' && ans.vi && ans.vi !== ans.en ? (
                          <span className="ml-2 text-xs font-normal text-teal-600">({ans.vi})</span>
                        ) : null}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PassBadge({ passed }: { passed: boolean }) {
  const { dict } = useN400Lang();
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        passed ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-600'
      }`}
    >
      {passed ? dict.mockTest.summary.passedLabel : dict.mockTest.summary.failedLabel}
    </span>
  );
}
