'use client';

// Phỏng vấn đầy đủ — chains the three standalone mock formats in one sitting:
// Civics (20 câu, đạt >=12) → Speaking (10 câu MC, đạt >=8) → Writing (3 câu
// dictation, đạt >=1). Reuses SectionMCQuiz + DictationQuiz; each part records
// through the same user-state paths as its standalone mock.

import { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import MockTestResult from './MockTestResult';
import ReviewWrongAnswers from './ReviewWrongAnswers';
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

const PARTS_COPY = [
  { label: 'Phần 1 · Civics', desc: `${FULL_CIVICS_COUNT} câu trắc nghiệm — đúng ≥ ${FULL_CIVICS_PASS} là đạt` },
  { label: 'Phần 2 · Speaking', desc: `${FULL_SPEAKING_COUNT} câu trắc nghiệm (What Mean + Yes/No) — đúng ≥ ${FULL_SPEAKING_PASS} là đạt` },
  { label: 'Phần 3 · Viết', desc: `${FULL_WRITING_COUNT} câu nghe-gõ lại — đúng ≥ ${FULL_WRITING_PASS} là đạt` },
];

export default function FullInterviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;
  const { state, hydrated, recordMockResult, recordSectionMockResult } = useN400UserState();

  const [seed, setSeed] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [civics, setCivics] = useState<PartResult | null>(null);
  const [speaking, setSpeaking] = useState<PartResult | null>(null);
  const [writing, setWriting] = useState<PartResult | null>(null);
  const civicsAnswers = useRef<{ questionId: number; wasCorrect: boolean }[]>([]);
  const startedAt = useRef<string>('');

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;

  const civicsQuestions = useMemo(
    () => buildCivicsPhase(`full-${seed}`, stateCode, districtNumber),
    [seed, stateCode, districtNumber],
  );
  const speakingQuestions = useMemo(() => buildSpeakingPhase(`full-${seed}`), [seed]);
  const writingQuestions = useMemo(() => buildWritingPhase(`full-${seed}`), [seed]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
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
        title="Phỏng vấn đầy đủ — Civics"
        skipSummary
        examMode
        onAnswer={(itemId, ok) =>
          civicsAnswers.current.push({ questionId: Number(itemId.slice(4)), wasCorrect: ok })
        }
        onComplete={({ correct }) => {
          const passed = correct >= FULL_CIVICS_PASS;
          setCivics({ correct, total: FULL_CIVICS_COUNT, passed });
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
            questionResults: civicsAnswers.current,
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
        title="Phỏng vấn đầy đủ — Speaking"
        skipSummary
        examMode
        onAnswer={() => {}}
        onComplete={({ correct }) => {
          const passed = correct >= FULL_SPEAKING_PASS;
          setSpeaking({ correct, total: FULL_SPEAKING_COUNT, passed });
          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT);
          setPhase({ kind: 'interlude', next: 'writing' });
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
        onSessionEnd={({ correct, total, answered }) => {
          // Mid-quiz "Đổi chế độ" abandons the part — record nothing, matching
          // civics/speaking onExit semantics. Only a fully answered session
          // (fired exactly once by DictationQuiz's skipSummary effect) counts.
          if (answered < total) {
            setPhase({ kind: 'intro' });
            return;
          }
          const passed = correct >= FULL_WRITING_PASS;
          setWriting({ correct, total, passed });
          setPhase({ kind: 'summary' });
          void recordSectionMockResult('writing', passed, correct, total);
        }}
      />
    );
  }

  if (phase.kind === 'interlude') {
    const isSpeaking = phase.next === 'speaking';
    const donePart = isSpeaking ? civics : speaking;
    return (
      <CenterCard>
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
          {isSpeaking ? 'Phần 1 hoàn thành' : 'Phần 2 hoàn thành'}
        </div>
        {donePart ? (
          <div className="mt-2 text-3xl font-extrabold text-gray-900">
            {donePart.correct}
            <span className="text-lg text-gray-500">/{donePart.total}</span>{' '}
            <span className={donePart.passed ? 'text-teal-600' : 'text-orange-500'}>
              {donePart.passed ? 'Đạt' : 'Chưa đạt'}
            </span>
          </div>
        ) : null}
        <h2 className="mt-4 text-xl font-extrabold text-gray-800">
          {isSpeaking ? PARTS_COPY[1].label : PARTS_COPY[2].label}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{isSpeaking ? PARTS_COPY[1].desc : PARTS_COPY[2].desc}</p>
        <button
          type="button"
          onClick={() => setPhase({ kind: phase.next })}
          className="group mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
        >
          Bắt đầu phần tiếp theo
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </CenterCard>
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
        wrongCount={totalQuestions - totalScore}
        civicsAnswers={civicsAnswers.current}
        onRetake={retake}
        onReviewWrongAnswers={() => setPhase({ kind: 'review' })}
        basePath={base}
      />
    );
  }

  if (phase.kind === 'review') {
    return (
      <ReviewWrongAnswers
        civicsAnswers={civicsAnswers.current}
        onBack={() => setPhase({ kind: 'summary' })}
        onRetake={retake}
      />
    );
  }

  // intro
  return (
    <CenterCard>
      <div className="text-4xl" aria-hidden>
        🎤
      </div>
      <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Phỏng vấn đầy đủ</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mô phỏng buổi phỏng vấn N-400: ba phần thi liên tục, không dừng giữa chừng. Đạt cả 3 phần là đậu.
      </p>
      <div className="mt-5 space-y-2 text-left">
        {PARTS_COPY.map((p) => (
          <div key={p.label} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <div className="text-sm font-bold text-gray-800">{p.label}</div>
            <div className="text-sm text-gray-500">{p.desc}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={begin}
        className="group mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-8 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
      >
        Bắt đầu thi
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </CenterCard>
  );
}

function CenterCard({ children, tone }: { children: React.ReactNode; tone?: 'pass' | 'fail' }) {
  const toneClass =
    tone === 'pass'
      ? 'border-teal-200 bg-teal-50'
      : tone === 'fail'
        ? 'border-orange-200 bg-orange-50'
        : 'border-slate-100 bg-white';
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto animate-in fade-in duration-300">
      <div className={`w-full max-w-lg rounded-[24px] border p-6 text-center shadow-sm sm:p-8 ${toneClass}`}>
        {children}
      </div>
    </div>
  );
}
