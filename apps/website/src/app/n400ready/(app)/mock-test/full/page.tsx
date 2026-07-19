'use client';

// Phỏng vấn đầy đủ — chains the three standalone mock formats in one sitting:
// Civics (20 câu, đạt >=12) → Speaking (10 câu MC, đạt >=8) → Writing (3 câu
// dictation, đạt >=1). Reuses SectionMCQuiz + DictationQuiz; each part records
// through the same user-state paths as its standalone mock.

import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  Lock,
  MessageCircle,
  Mic,
  PenLine,
  Play,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import MockTestResult from './MockTestResult';
import ReviewAnswers, {
  type CivicsAnswer,
  type SpeakingAnswer,
  type WritingAnswer,
} from './ReviewAnswers';
import { InterludeScreen } from './interview-chrome';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  FULL_CIVICS_COUNT,
  FULL_CIVICS_PASS,
  FULL_SPEAKING_COUNT,
  FULL_SPEAKING_PASS,
  FULL_WRITING_COUNT,
  FULL_WRITING_PASS,
  buildCivicsPhase,
  buildSpeakingPhase,
  buildWritingPhase,
} from '@/lib/n400/full-interview';
import { SectionMCQuiz } from '@/components/n400/speaking/SectionMCQuiz';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

interface PartResult {
  correct: number;
  total: number;
  passed: boolean;
}

type Phase =
  | { kind: 'intro' }
  | { kind: 'civics' }
  | { kind: 'interlude'; next: 'speaking' | 'writing' }
  | { kind: 'speaking' }
  | { kind: 'writing' }
  | { kind: 'summary' }
  | { kind: 'review' };

// Guarded id (same pattern as analytics' generateEventId): crypto.randomUUID
// throws in non-secure contexts / older Safari, and this runs while the quiz
// renders null — a throw there would strand the user on a blank screen.
function generateAttemptId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const FULL_TOTAL_COUNT = FULL_CIVICS_COUNT + FULL_SPEAKING_COUNT + FULL_WRITING_COUNT;

function buildPartsCopy(dict: N400Dict): {
  icon: LucideIcon;
  tone: string;
  label: string;
  desc: string;
  passMin: number;
  total: number;
}[] {
  return [
    {
      icon: BookOpen,
      tone: 'bg-teal-50 text-teal-600',
      label: dict.mockTest.full.partLabels.civics,
      desc: tFormat(dict.mockTest.full.civicsDesc, { count: FULL_CIVICS_COUNT }),
      passMin: FULL_CIVICS_PASS,
      total: FULL_CIVICS_COUNT,
    },
    {
      icon: MessageCircle,
      tone: 'bg-blue-50 text-blue-600',
      label: dict.mockTest.full.partLabels.speaking,
      desc: tFormat(dict.mockTest.full.speakingDesc, { count: FULL_SPEAKING_COUNT }),
      passMin: FULL_SPEAKING_PASS,
      total: FULL_SPEAKING_COUNT,
    },
    {
      icon: PenLine,
      tone: 'bg-orange-50 text-orange-500',
      label: dict.mockTest.full.partLabels.writing,
      desc: tFormat(dict.mockTest.full.writingDesc, { count: FULL_WRITING_COUNT }),
      passMin: FULL_WRITING_PASS,
      total: FULL_WRITING_COUNT,
    },
  ];
}

function buildIntroChips(dict: N400Dict): { icon: LucideIcon; label: string }[] {
  return [
    { icon: ClipboardList, label: tFormat(dict.mockTest.full.introChips.totalQuestions, { count: FULL_TOTAL_COUNT }) },
    { icon: Clock, label: dict.mockTest.full.introChips.duration },
    { icon: ShieldCheck, label: dict.mockTest.full.introChips.standard },
    { icon: Lock, label: dict.mockTest.full.introChips.noReview },
  ];
}

function buildIntroRules(dict: N400Dict): { icon: LucideIcon; text: string }[] {
  return [
    { icon: Play, text: dict.mockTest.full.introRules.continuous },
    { icon: XCircle, text: dict.mockTest.full.introRules.noBack },
    { icon: BarChart3, text: dict.mockTest.full.introRules.resultAfter },
  ];
}

export default function FullInterviewPage() {
  const { dict } = useN400Lang();
  const base = '/n400ready';
  const { state, hydrated, recordMockResult, recordSectionMockResult } = useN400UserState();
  const PARTS_COPY = buildPartsCopy(dict);
  const INTRO_CHIPS = buildIntroChips(dict);
  const INTRO_RULES = buildIntroRules(dict);

  const [seed, setSeed] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [civics, setCivics] = useState<PartResult | null>(null);
  const [speaking, setSpeaking] = useState<PartResult | null>(null);
  const [writing, setWriting] = useState<PartResult | null>(null);
  // Per-answer verdicts accumulate in refs during the quizzes (no re-render
  // per answer); onComplete snapshots them into state, which is what the
  // summary/review renders read — render never touches the refs.
  const civicsAnswers = useRef<CivicsAnswer[]>([]);
  const [civicsAnswerList, setCivicsAnswerList] = useState<CivicsAnswer[]>([]);
  const speakingAnswers = useRef<SpeakingAnswer[]>([]);
  const [speakingAnswerList, setSpeakingAnswerList] = useState<SpeakingAnswer[]>([]);
  const [writingAnswerList, setWritingAnswerList] = useState<WritingAnswer[]>([]);
  const startedAt = useRef<string>('');

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;

  const civicsQuestions = useMemo(
    () => buildCivicsPhase(`full-${seed}`, stateCode, districtNumber, dict),
    [seed, stateCode, districtNumber, dict],
  );
  const speakingQuestions = useMemo(() => buildSpeakingPhase(`full-${seed}`, dict), [seed, dict]);
  const writingQuestions = useMemo(() => buildWritingPhase(`full-${seed}`), [seed]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const begin = () => {
    // Bump the seed FIRST: quiz keys derive from it, so a mid-part restart
    // ("Trộn lại") remounts the quiz with fresh questions instead of silently
    // wiping the refs under a still-mounted session.
    //
    // The bump is randomized (not just +1): seed starts at 0 and resets on every
    // page load, so a plain +1 would always land on `full-1` for a fresh visit —
    // making every "Bắt đầu thi" serve the exact same questions. Adding a random
    // amount keeps the seed strictly increasing (guarantees a remount) while
    // making the question set unpredictable across page loads. Randomizing only
    // here (in a client-side handler), not in useState, avoids SSR hydration
    // mismatch since the initial render stays deterministic at seed 0.
    setSeed((s) => s + 1 + Math.floor(Math.random() * 1_000_000));
    civicsAnswers.current = [];
    setCivicsAnswerList([]);
    speakingAnswers.current = [];
    setSpeakingAnswerList([]);
    setWritingAnswerList([]);
    startedAt.current = new Date().toISOString();
    setCivics(null);
    setSpeaking(null);
    setWriting(null);
    setPhase({ kind: 'civics' });
  };

  // begin() already reshuffles via its seed bump — no double bump here.
  const retake = () => {
    setPhase({ kind: 'intro' });
  };

  if (phase.kind === 'civics') {
    return (
      <SectionMCQuiz
        key={`civ-${seed}`}
        questions={civicsQuestions}
        title={dict.mockTest.full.civicsQuizTitle}
        skipSummary
        examMode
        mockMode="full"
        examSection={{ current: 1, total: 3, ...dict.mockTest.full.civicsSection }}
        onAnswer={(itemId, ok, selected) =>
          civicsAnswers.current.push({
            questionId: Number(itemId.slice(4)),
            wasCorrect: ok,
            selectedEn: selected?.en,
          })
        }
        onComplete={({ correct }) => {
          const passed = correct >= FULL_CIVICS_PASS;
          setCivics({ correct, total: FULL_CIVICS_COUNT, passed });
          setCivicsAnswerList([...civicsAnswers.current]);
          // Advance BEFORE recording so a recording throw can't strand the
          // user on the quiz's null (skipSummary) render.
          setPhase({ kind: 'interlude', next: 'speaking' });
          void recordMockResult({
            id: generateAttemptId(),
            startedAt: startedAt.current,
            completedAt: new Date().toISOString(),
            score: correct,
            total: FULL_CIVICS_COUNT,
            passed,
            // Persisted attempts keep the lean shape — selectedEn only feeds
            // this session's review screen.
            questionResults: civicsAnswers.current.map(({ questionId, wasCorrect }) => ({
              questionId,
              wasCorrect,
            })),
          });
        }}
        onExit={() => setPhase({ kind: 'intro' })}
        onRestart={begin}
      />
    );
  }

  if (phase.kind === 'speaking') {
    return (
      <SectionMCQuiz
        key={`sp-${seed}`}
        questions={speakingQuestions}
        title={dict.mockTest.full.speakingQuizTitle}
        skipSummary
        examMode
        mockMode="full"
        examSection={{ current: 2, total: 3, ...dict.mockTest.full.speakingSection }}
        onAnswer={(itemId, ok, selected) =>
          speakingAnswers.current.push({ itemId, wasCorrect: ok, selectedEn: selected?.en })
        }
        onComplete={({ correct }) => {
          const passed = correct >= FULL_SPEAKING_PASS;
          setSpeaking({ correct, total: FULL_SPEAKING_COUNT, passed });
          setSpeakingAnswerList([...speakingAnswers.current]);
          setPhase({ kind: 'interlude', next: 'writing' });
          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT);
        }}
        onExit={() => setPhase({ kind: 'intro' })}
        onRestart={begin}
      />
    );
  }

  if (phase.kind === 'writing') {
    return (
      <DictationQuiz
        key={`wr-${seed}`}
        questions={writingQuestions}
        skipSummary
        examMode
        mockMode="full"
        examSection={{ current: 3, total: 3, ...dict.mockTest.full.writingSection }}
        onSessionEnd={({ correct, total, answered, perItem }) => {
          // Mid-quiz "Đổi chế độ" abandons the part — record nothing, matching
          // civics/speaking onExit semantics. Only a fully answered session
          // (fired exactly once by DictationQuiz's skipSummary effect) counts.
          if (answered < total) {
            setPhase({ kind: 'intro' });
            return;
          }
          const passed = correct >= FULL_WRITING_PASS;
          setWriting({ correct, total, passed });
          setWritingAnswerList(perItem);
          setPhase({ kind: 'summary' });
          void recordSectionMockResult('writing', passed, correct, total);
        }}
      />
    );
  }

  if (phase.kind === 'interlude') {
    return (
      <InterludeScreen
        next={phase.next}
        donePart={phase.next === 'speaking' ? civics : speaking}
        onContinue={() => setPhase({ kind: phase.next })}
      />
    );
  }

  if (phase.kind === 'summary') {
    const totalScore = (civics?.correct ?? 0) + (speaking?.correct ?? 0) + (writing?.correct ?? 0);
    const totalQuestions = FULL_CIVICS_COUNT + FULL_SPEAKING_COUNT + FULL_WRITING_COUNT;
    const overall = [civics, speaking, writing].every((p) => p?.passed);
    return (
      <MockTestResult
        civics={civics}
        speaking={speaking}
        writing={writing}
        overall={overall}
        totalScore={totalScore}
        totalQuestions={totalQuestions}
        civicsAnswers={civicsAnswerList}
        onRetake={retake}
        onReviewAnswers={() => setPhase({ kind: 'review' })}
        basePath={base}
      />
    );
  }

  if (phase.kind === 'review') {
    const totalScore = (civics?.correct ?? 0) + (speaking?.correct ?? 0) + (writing?.correct ?? 0);
    const overall = [civics, speaking, writing].every((p) => p?.passed);
    return (
      <ReviewAnswers
        civicsAnswers={civicsAnswerList}
        speakingQuestions={speakingQuestions}
        speakingAnswers={speakingAnswerList}
        writingQuestions={writingQuestions}
        writingAnswers={writingAnswerList}
        civics={civics}
        speaking={speaking}
        writing={writing}
        totalScore={totalScore}
        totalQuestions={FULL_TOTAL_COUNT}
        overall={overall}
        onBack={() => setPhase({ kind: 'summary' })}
        onRetake={retake}
      />
    );
  }

  // intro
  return (
    <CenterCard wide>
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600"
        aria-hidden
      >
        <Mic size={28} />
      </div>
      <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight text-gray-900">
        {dict.mockTest.full.startTitle}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-gray-600">
        {dict.mockTest.full.introLine1}
        <br className="hidden sm:block" /> {dict.mockTest.full.introLine2}
      </p>

      {/* Quick info chips */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {INTRO_CHIPS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm font-semibold text-gray-700"
            >
              <Icon size={16} className="shrink-0 text-gray-500" />
              {c.label}
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-100" />

      {/* Interview sections */}
      <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100 text-left">
        {PARTS_COPY.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.label}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-4 sm:flex-nowrap sm:px-5"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${p.tone}`}
                aria-hidden
              >
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[0.9375rem] font-bold text-gray-900">{p.label}</div>
                <div className="mt-0.5 text-sm leading-relaxed text-gray-500">{p.desc}</div>
              </div>
              <div className="w-full shrink-0 pl-16 text-left sm:w-auto sm:pl-0 sm:text-right">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {tFormat(dict.mockTest.full.passMinLabel, { passMin: p.passMin })}
                </span>{' '}
                <span className="whitespace-nowrap text-xs font-medium text-teal-600/80 sm:block">
                  {tFormat(dict.mockTest.full.onTotalLabel, { total: p.total })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interview rules */}
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-left sm:p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
          <Info size={16} className="shrink-0" />
          {dict.mockTest.full.importantNote}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {INTRO_RULES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.text} className="flex items-start gap-2.5">
                <Icon size={18} className="mt-0.5 shrink-0 text-blue-600" />
                <span className="text-[0.8125rem] leading-relaxed text-gray-700">{r.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={begin}
        className="group mx-auto mt-7 inline-flex w-full max-w-[300px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
      >
        {dict.mockTest.full.startTitle}
        <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
      </button>
      <p className="mt-3 text-sm text-gray-600">{dict.mockTest.full.goodLuck}</p>
    </CenterCard>
  );
}

function CenterCard({
  children,
  tone,
  wide,
}: {
  children: React.ReactNode;
  tone?: 'pass' | 'fail';
  wide?: boolean;
}) {
  const toneClass =
    tone === 'pass'
      ? 'border-teal-200 bg-teal-50'
      : tone === 'fail'
        ? 'border-orange-200 bg-orange-50'
        : 'border-slate-100 bg-white';
  return (
    <div className="flex min-h-full animate-in fade-in duration-300">
      <div
        className={`m-auto w-full rounded-[24px] border p-6 text-center shadow-sm sm:p-8 ${
          wide ? 'max-w-[740px]' : 'max-w-lg'
        } ${toneClass}`}
      >
        {children}
      </div>
    </div>
  );
}
