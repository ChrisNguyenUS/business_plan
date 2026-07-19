'use client';

// Writing (dictation) hub — an execution page: Hero (identity + progress) →
// Practice (primary CTA) → Writing Rules (reference, informational only) →
// Weak Areas. Writing is practice-only (no flashcard deck) and has no
// "continue learning" card. Picking a mode drops into DictationQuiz.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WRITING_SENTENCES, type WritingSentence } from '@/lib/n400/writing-data';
import { writingPresets } from '@/lib/n400/section-presets';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import { shuffle } from '@/lib/n400/quiz-engine';
import {
  deriveSectionSeen,
  deriveSectionGradedTally,
  lastWrongSectionItemIds,
} from '@/lib/n400/section-progress';
import { deriveHubProgress } from '@/lib/n400/hub-progress';
import { HubHero, HubWeakAreasCard } from '@/components/n400/hub/HubCards';
import {
  PracticeSelector,
  presetModes,
  PRACTICE_ACCENTS,
  type PracticeMode,
} from '@/components/n400/hub/PracticeSelector';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';

const ALL = WRITING_SENTENCES;

type Mode =
  | { kind: 'landing' }
  | { kind: 'quiz'; questions: WritingSentence[]; minutes?: number | null };

export default function WritingPage() {
  const { dict } = useN400Lang();
  const { state, hydrated, recordSectionAnswer } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });
  const router = useRouter();
  const pathname = usePathname();

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).writing, [state.sectionAttempts]);
  const progress = useMemo(
    () => deriveHubProgress(ALL, (q) => seen.has(q.id), (q) => q.num),
    [seen],
  );
  const wrongIds = useMemo(
    () => lastWrongSectionItemIds(state.sectionAttempts, 'writing'),
    [state.sectionAttempts],
  );
  const graded = useMemo(
    () => deriveSectionGradedTally(state.sectionAttempts).writing,
    [state.sectionAttempts],
  );

  const wrongsCount = Math.min(wrongIds.length, 10);
  const recommendedId = wrongsCount > 0 ? 'wrongs' : 'standard';

  const modes = useMemo<PracticeMode[]>(() => {
    const list: PracticeMode[] = [];
    if (wrongsCount > 0) {
      list.push({
        id: 'wrongs',
        title: dict.common.reviewWrongAnswers,
        desc: dict.writing.wrongsDesc,
        countLabel: tFormat(dict.study.civics.practice.countLabel, { count: wrongsCount }),
        minutes: 5,
      });
    }
    list.push(...presetModes(writingPresets(dict), ALL.length, dict.study.hub.unitQuestion));
    return list;
  }, [wrongsCount, dict]);

  // ?start=wrongs deep link (study tip / card review link): one 10-sentence
  // chunk of review debt. Param is stripped immediately so back-nav or reload
  // lands on the plain hub; with no debt the hub itself is the fallback.
  const startWrongsReview = () => {
    const ids = lastWrongSectionItemIds(state.sectionAttempts, 'writing').slice(0, 10);
    const questions = ids
      .map((id) => ALL.find((s) => s.id === id))
      .filter((s): s is WritingSentence => s !== undefined);
    if (questions.length > 0) {
      setMode({ kind: 'quiz', questions });
      router.push(`${pathname}?mode=practice`, { scroll: false });
    }
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
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const startQuizWith = (count: number, minutes?: number | null) => {
    const questions = shuffle([...ALL], `wr-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', questions, minutes });
    router.push(`${pathname}?mode=practice`, { scroll: false });
  };

  const startMode = (m: PracticeMode) => {
    if (m.id === 'wrongs') startWrongsReview();
    else {
      const preset = writingPresets(dict).find((p) => p.id === m.id);
      startQuizWith(preset?.count ?? ALL.length, preset?.minutes);
    }
  };

  if (mode.kind === 'quiz') {
    const { questions } = mode;
    return (
      <DictationQuiz
        questions={questions}
        estimatedMinutes={mode.minutes}
        onSessionEnd={({ perItem }) => {
          // Record each graded sentence with its REAL verdict — review debt
          // ("câu sai chưa ôn") is derived from these attempts, so the split
          // must match what the learner actually got wrong.
          perItem.forEach(({ sentenceId, correct }) => {
            void recordSectionAnswer('writing', sentenceId, correct, 'practice');
          });
          setMode({ kind: 'landing' });
          router.replace(pathname, { scroll: false });
        }}
      />
    );
  }

  // "Need improvement" strip: only with enough graded evidence, never for a
  // new user (spec §7).
  const accuracy = graded.total > 0 ? Math.round((graded.correct / graded.total) * 100) : 0;
  const showWeak = graded.total >= 5 && accuracy < 80;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4 animate-in fade-in duration-300 sm:gap-4">
        <HubHero
          emoji="✍️"
          imageSrc="/images/n400/writing-thumbnail-study.png"
          title="Writing"
          countLabel={tFormat(dict.writing.heroCount, { count: ALL.length })}
          tagline={dict.writing.tagline}
          accentTextClass="text-orange-600"
          accentBarClass="bg-orange-500"
          stats={{ seenCount: progress.seenCount, totalCount: progress.totalCount, percent: progress.percent }}
        />

        <PracticeSelector
          skillKey="writing"
          modes={modes}
          recommendedId={recommendedId}
          illustrationSrc="/images/n400/practice_individual/writing-thumbnail-select-mode.png"
          accent={PRACTICE_ACCENTS.writing}
          onStart={startMode}
        />

        {/* Writing Rules — reference card, informational only (spec §8) */}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="shrink-0 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-800">{dict.writing.rulesCardTitle}</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
            {dict.writing.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        {showWeak ? (
          <HubWeakAreasCard
            title={dict.writing.weakTitle}
            subtitle={dict.writing.weakSubtitle}
            metricLabel={dict.quiz.avgAccuracyLabel}
            percentSuffix=""
            accuracyPercent={accuracy}
            onPractice={() => {
              if (wrongIds.length > 0) startWrongsReview();
              else startQuizWith(10, 5);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
