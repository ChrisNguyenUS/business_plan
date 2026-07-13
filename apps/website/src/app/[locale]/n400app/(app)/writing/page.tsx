'use client';

// Writing (dictation) section. Landing is a hub (Continue + Practice + the
// always-on USCIS writing-rules guidance box); picking a mode drops into
// DictationQuiz for that many sentences. Mirrors the what-mean / yes-no hub
// shell, minus the Thẻ học card (writing is practice-only, no flashcards).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WRITING_SENTENCES, type WritingSentence } from '@/lib/n400/writing-data';
import { WRITING_PRESETS } from '@/lib/n400/section-presets';
import { shuffle, type PracticePreset } from '@/lib/n400/quiz-engine';
import { deriveSectionSeen, lastWrongSectionItemIds } from '@/lib/n400/section-progress';
import { deriveHubProgress, continueOrder } from '@/lib/n400/hub-progress';
import { HubHero, HubContinueCard } from '@/components/n400/hub/HubCards';
import { PracticeSelector } from '@/components/n400/hub/PracticeSelector';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';

const ALL = WRITING_SENTENCES;

// "Tiếp tục học" session length — same size as the standard practice mode.
const CONTINUE_COUNT = WRITING_PRESETS.find((p) => p.id === 'standard')?.count ?? 10;

type Mode =
  | { kind: 'landing' }
  | { kind: 'quiz'; questions: WritingSentence[] };

const WRITING_RULES = [
  'Viết hoa tên người và địa danh (ví dụ: George Washington, California).',
  'Viết hoa chữ cái đầu câu và không viết tắt (viết United States, không viết U.S.).',
  'Nghe kỹ — dùng nút "Đọc chậm" nếu chưa rõ, rồi gõ lại đúng chính tả.',
];

export default function WritingPage() {
  const { state, hydrated, recordSectionAnswer } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).writing, [state.sectionAttempts]);
  const progress = useMemo(
    () => deriveHubProgress(ALL, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );

  // ?start=wrongs deep link (study tip / card review link): one 10-sentence
  // chunk of review debt. Param is stripped immediately so back-nav or reload
  // lands on the plain hub; with no debt the hub itself is the fallback.
  const startWrongsReview = () => {
    const wrongIds = lastWrongSectionItemIds(state.sectionAttempts, 'writing').slice(0, 10);
    const questions = wrongIds
      .map((id) => ALL.find((s) => s.id === id))
      .filter((s): s is WritingSentence => s !== undefined);
    if (questions.length > 0) setMode({ kind: 'quiz', questions });
  };
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!hydrated || autoStarted.current) return;
    if (new URLSearchParams(window.location.search).get('start') !== 'wrongs') return;
    autoStarted.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    // One-shot URL-to-state sync (same deep-link pattern as practice/page.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startWrongsReview();
  });

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const startQuiz = (preset: PracticePreset) => {
    const count = preset.count ?? ALL.length;
    const questions = shuffle([...ALL], `wr-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', questions });
  };

  const startContinue = () => {
    const ordered = continueOrder(ALL, (q) => seen.has(q.id));
    setMode({ kind: 'quiz', questions: ordered.slice(0, CONTINUE_COUNT) });
  };

  if (mode.kind === 'quiz') {
    const { questions } = mode;
    return (
      <DictationQuiz
        questions={questions}
        onSessionEnd={({ perItem }) => {
          // Record each graded sentence with its REAL verdict — review debt
          // ("câu sai chưa ôn") is derived from these attempts, so the split
          // must match what the learner actually got wrong.
          perItem.forEach(({ sentenceId, correct }) => {
            void recordSectionAnswer('writing', sentenceId, correct, 'practice');
          });
          setMode({ kind: 'landing' });
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4 animate-in fade-in duration-300 sm:gap-4">
        <HubHero
          emoji="✍️"
          imageSrc="/images/n400/writing-thumbnail-study.png"
          title="Writing"
          countLabel={`${ALL.length} câu viết`}
          tagline="Nghe và gõ lại câu — luyện phần thi viết N-400."
          stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
        />
        <HubContinueCard
          seenCount={progress.seenCount}
          totalCount={progress.totalCount}
          percent={progress.percent}
          nextLabel={
            progress.nextNumber !== null
              ? `Bạn đang ở câu #${progress.nextNumber}`
              : 'Bạn đã luyện hết — ôn lại nhé!'
          }
          started={progress.started}
          onContinue={startContinue}
        />

        {/* Guidance box (always visible) — unchanged */}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="shrink-0 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-800">Quy tắc viết</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
            {WRITING_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <PracticeSelector
          skillKey="writing"
          subtitle="Nghe câu và gõ lại đúng chính tả."
          presets={WRITING_PRESETS}
          totalCount={ALL.length}
          onStart={(p) => startQuiz(p)}
        />
      </div>
    </div>
  );
}
