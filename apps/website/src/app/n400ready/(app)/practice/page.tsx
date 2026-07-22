'use client';

/*
 * PRACTICE PAGE — LAYOUT ARCHITECTURE
 *
 * This page uses an immersive layout (see practice/layout.tsx):
 * - The page NEVER scrolls.
 * - The Study Body is the ONLY scrollable area.
 * - English and Vietnamese content ALWAYS stay together.
 * - Bottom study controls ALWAYS remain visible and anchored.
 * - Every question begins from a predictable clean state.
 */

import { Bookmark, CheckCircle, XCircle, ArrowRight, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { PracticeProgressRow, PracticeSupportPanel, LearningTipCard } from '@/components/n400/practice-chrome';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone, trackPracticeComplete } from '@/lib/n400/analytics';
import { N400_QUESTIONS, N400_CATEGORY_LABELS, type N400CategoryKey } from '@/lib/n400/questions-data';
import {
  buildOptions,
  correctAnswersFor,
  selectPracticeQuestionIds,
  isPersonalizedAnswerUnavailable,
  mostMissedCategory,
  recommendWeakCategory,
  gradedOnly,
  lastWrongQuestionIds,
  practicePresets,
  type PracticePreset,
  type PracticeRecommendation,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { questionAudioUrl, answerAudioUrlFor } from '@/lib/n400/quiz-engine';
import { pendingMockReviewIds } from '@/lib/n400/hero-recommendation';
import { useRouter } from 'next/navigation';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PersonalizedAnswerNotice } from '@/components/n400/PersonalizedAnswerNotice';
import { GrowthSlot } from '@/components/n400/GrowthSlot';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

const PRESET_STORAGE_KEY = 'n400.practice.preset';
const PROGRESS_STORAGE_KEY = 'n400.practice.progress';
const CATEGORY_STORAGE_KEY = 'n400.practice.category';
const SEED_STORAGE_KEY = 'n400.practice.seed';
// "Tiến độ hôm nay" on the summary — completed sessions per local day, kept in
// localStorage so it survives tab closes (unlike the resumable-session keys).
const DAILY_SESSIONS_KEY = 'n400.practice.dailySessions';
const DAILY_SESSIONS_GOAL = 5;

function bumpDailySessions(): number {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  try {
    const raw = window.localStorage.getItem(DAILY_SESSIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { date?: unknown; count?: unknown }) : null;
    const count =
      parsed && parsed.date === today && typeof parsed.count === 'number' ? parsed.count + 1 : 1;
    window.localStorage.setItem(DAILY_SESSIONS_KEY, JSON.stringify({ date: today, count }));
    return count;
  } catch {
    return 1;
  }
}

function readStoredPreset(presets: PracticePreset[]): PracticePreset | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PRESET_STORAGE_KEY);
  return presets.find((p) => p.id === raw) ?? null;
}

function readStoredProgress(): { index: number; correct: number; wrong: number[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { index?: unknown; correct?: unknown; wrong?: unknown };
    if (typeof parsed.index !== 'number' || typeof parsed.correct !== 'number') return null;
    // `wrong` was added later; older snapshots without it are still valid.
    const wrong = Array.isArray(parsed.wrong)
      ? parsed.wrong.filter((n): n is number => typeof n === 'number')
      : [];
    return { index: parsed.index, correct: parsed.correct, wrong };
  } catch {
    return null;
  }
}

function readStoredCategory(): N400CategoryKey | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(CATEGORY_STORAGE_KEY);
  return raw !== null && raw in N400_CATEGORY_LABELS ? (raw as N400CategoryKey) : null;
}

/* ─── Interaction State Machine ─── */
type StudyPhase = 'idle' | 'revealed';

export default function PracticePage() {
  const { dict, lang } = useN400Lang();
  const {
    state,
    hydrated,
    recordAnswer,
    toggleBookmark,
  } = useN400UserState();

  const router = useRouter();
  const civicsHubHref = '/n400ready/study/civics';
  const presets = useMemo(() => practicePresets(dict), [dict]);

  const [seed, setSeed] = useState(() => {
    if (typeof window === 'undefined') return 'init';
    const existing = window.sessionStorage.getItem(SEED_STORAGE_KEY);
    if (existing) return existing;
    const next = String(Date.now());
    window.sessionStorage.setItem(SEED_STORAGE_KEY, next);
    return next;
  });

  // null until the ?start= deep link (or the resume snapshot) picks a mode in
  // the auto-start effect below; bare /practice with nothing to resume
  // redirects back to the Civics hub, where the mode picker now lives.
  const [preset, setPreset] = useState<PracticePreset | null>(null);
  const [focusCategory, setFocusCategory] = useState<N400CategoryKey | null>(() => readStoredCategory());
  const [completed, setCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // Distinct question ids answered wrong this session, in order of appearance;
  // feeds the "Review wrong answers" flow on the summary screen.
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  // Non-null while replaying the wrong answers of the previous run. Review
  // sessions are ephemeral: they are never persisted or offered as resume.
  const [reviewIds, setReviewIds] = useState<number[] | null>(null);
  // Session timing + today's completed-session count, both surfaced on the
  // summary. The timer restarts on resume — better a low estimate than one
  // inflated by hours away from the tab.
  const startedAtRef = useRef(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<QuizOption['id'] | null>(null);
  const [phase, setPhase] = useState<StudyPhase>('idle');
  const [prevIndex, setPrevIndex] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const badges = useN400Badges();
  const studyBodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Full UI reset when navigating between questions (React-recommended pattern).
  if (index !== prevIndex) {
    setPrevIndex(index);
    setSelected(null);
    setPhase('idle');
    setShowAllAnswers(false);
    setMilestone(null);
    setUnlockedBadges([]);
  }

  // After render: reset scroll position and focus
  useEffect(() => {
    studyBodyRef.current?.scrollTo({ top: 0 });
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  // The feedback renders below the options grid; nudge it into view on the
  // rare screens where the study body still overflows.
  useEffect(() => {
    if (phase !== 'revealed') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [phase]);

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;
  const order = useMemo(
    () => reviewIds ?? selectPracticeQuestionIds(seed, preset?.count ?? null, focusCategory),
    [reviewIds, seed, preset, focusCategory]
  );

  // Unfinished session (persisted across navigation within the tab) picked up
  // by the auto-start effect on bare /practice. Progress is written on each advance.
  const resume = useMemo(() => {
    if (preset !== null) return null;
    const stored = readStoredPreset(presets);
    if (!stored) return null;
    const progress = readStoredProgress();
    if (!progress) return null;
    const total = stored.count ?? N400_QUESTIONS.length;
    if (progress.index < 1 || progress.index >= total) return null;
    return { preset: stored, index: progress.index, total, correct: progress.correct, wrong: progress.wrong };
  }, [preset, presets]);

  // Weakness signals come from graded attempts only — flashcard self-grades
  // are recognition, not retrieval (spec D1).
  const recommendation = useMemo(
    () => recommendWeakCategory(gradedOnly(state.attempts)),
    [state.attempts]
  );

  const question = useMemo(() => {
    const id = order[index];
    return N400_QUESTIONS.find((q) => q.id === id)!;
  }, [order, index]);

  const options = useMemo(
    () => buildOptions(question, stateCode, `practice-${seed}-${index}`, districtNumber),
    [question, stateCode, seed, index, districtNumber]
  );

  const allCorrect = correctAnswersFor(question, stateCode, districtNumber);
  const allAnswers = allCorrect.length > 0
    ? allCorrect
    : question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }));

  const isBookmarked = state.bookmarks.includes(question.id);
  const pickedOption = options.find((o) => o.id === selected) ?? null;

  const markWrong = (questionId: number) => {
    setWrongIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
  };

  const onPick = (id: QuizOption['id']) => {
    if (phase === 'revealed') return;
    setSelected(id);
    setPhase('revealed');
    const opt = options.find((o) => o.id === id);
    const wasCorrect = !!opt?.isCorrect;
    if (wasCorrect) setCorrectCount((c) => c + 1);
    else markWrong(question.id);
    void recordAnswer(question.id, wasCorrect, 'practice').then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
  };

  const onNext = () => {
    // Guarantees trackPracticeComplete fires at most once per session even if
    // this handler is ever reachable after completion (double-click, hotkeys).
    if (completed) return;
    if (index + 1 >= order.length) {
      trackPracticeComplete(correctCount, order.length);
      window.sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
      setElapsedSec(Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)));
      setSessionsToday(bumpDailySessions());
      setCompleted(true);
      return;
    }
    // Snapshot progress on each advance: correctCount/wrongIds already include
    // the question just answered, and index + 1 is the next unanswered question.
    // Review sessions are never resumable, so they skip the snapshot.
    if (reviewIds === null) {
      window.sessionStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({ index: index + 1, correct: correctCount, wrong: wrongIds })
      );
    }
    setIndex((i) => i + 1);
  };

  // Per-question UI back to a clean state (mirrors the index-change reset).
  const resetQuestionUI = () => {
    setSelected(null);
    setPhase('idle');
    setShowAllAnswers(false);
    setMilestone(null);
    setUnlockedBadges([]);
  };

  const reseed = () => {
    const next = String(Date.now());
    window.sessionStorage.setItem(SEED_STORAGE_KEY, next);
    setSeed(next);
  };

  const startSession = (p: PracticePreset, category: N400CategoryKey | null) => {
    reseed();
    window.sessionStorage.setItem(PRESET_STORAGE_KEY, p.id);
    if (category !== null) window.sessionStorage.setItem(CATEGORY_STORAGE_KEY, category);
    else window.sessionStorage.removeItem(CATEGORY_STORAGE_KEY);
    window.sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
    setFocusCategory(category);
    setPreset(p);
    setReviewIds(null);
    setWrongIds([]);
    setIndex(0);
    setPrevIndex(0);
    setCorrectCount(0);
    setCompleted(false);
    startedAtRef.current = Date.now();
    resetQuestionUI();
  };

  const onPracticeRecommendation = (rec: PracticeRecommendation) => {
    const quick = presets.find((p) => p.id === 'quick')!;
    startSession(quick, rec.category);
  };

  const onResume = () => {
    if (!resume) return;
    setFocusCategory(readStoredCategory());
    setPreset(resume.preset);
    setReviewIds(null);
    setWrongIds(resume.wrong);
    setIndex(resume.index);
    setPrevIndex(resume.index);
    setCorrectCount(resume.correct);
    setCompleted(false);
    startedAtRef.current = Date.now();
    resetQuestionUI();
  };

  // Replay a specific id list as an ephemeral (non-resumable) review session.
  // Same reset choreography as onReviewWrong; used by the ?start=review deep
  // link from the dashboard hero.
  const startReviewSession = (ids: number[]) => {
    reseed();
    window.sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
    setPreset(presets.find((p) => p.id === 'quick')!);
    setReviewIds(ids);
    setWrongIds([]);
    setIndex(0);
    setPrevIndex(0);
    setCorrectCount(0);
    setCompleted(false);
    startedAtRef.current = Date.now();
    resetQuestionUI();
  };

  // Deep-link entry (hub → practice). ?start=<preset id> starts that mode,
  // ?start=weak starts a weak-topic session, ?start=review replays the
  // uncorrected wrong answers of the latest mock test, ?start=wrongs pays down
  // a ≤10-question chunk of overall review debt. Bare /practice resumes
  // an unfinished session, else returns to the Civics hub — the mode picker
  // moved there (PracticeModesSheet).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!hydrated || preset !== null || autoStarted.current) return;
    autoStarted.current = true;
    const start = new URLSearchParams(window.location.search).get('start');
    // Strip ?start= immediately so a mid-session reload or back-nav lands on
    // bare /practice and hits the resume branch instead of restarting a mode.
    if (start) window.history.replaceState(null, '', window.location.pathname);
    const chosen = presets.find((p) => p.id === start);
    if (chosen) {
      startSession(chosen, null);
      return;
    }
    if (start === 'weak') {
      if (recommendation) onPracticeRecommendation(recommendation);
      else startSession(presets.find((p) => p.id === 'standard')!, null);
      return;
    }
    if (start === 'review') {
      const ids = pendingMockReviewIds(state.mockResults, state.attempts, new Date());
      if (ids.length > 0) {
        startReviewSession(ids);
      } else if (recommendation) {
        // Nothing left to review (stale link / already cleared) — fall back
        // to the closest useful session instead of dead-ending.
        onPracticeRecommendation(recommendation);
      } else {
        startSession(presets.find((p) => p.id === 'standard')!, null);
      }
      return;
    }
    if (start === 'wrongs') {
      // One chunk of overall review debt (study-tip deep link): freshest mock
      // wrongs first, then the remaining graded wrongs, most recent first.
      const pending = pendingMockReviewIds(state.mockResults, state.attempts, new Date());
      const rest = lastWrongQuestionIds(state.attempts).filter((id) => !pending.includes(id));
      const ids = [...pending, ...rest].slice(0, 10);
      if (ids.length > 0) {
        startReviewSession(ids);
      } else if (recommendation) {
        onPracticeRecommendation(recommendation);
      } else {
        startSession(presets.find((p) => p.id === 'standard')!, null);
      }
      return;
    }
    if (resume) {
      onResume();
      return;
    }
    router.replace(civicsHubHref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, preset]);

  // Retry the same mode with a new shuffle. Always returns to the full mode,
  // even when invoked from a review session.
  const onRestart = () => {
    reseed();
    window.sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
    setReviewIds(null);
    setWrongIds([]);
    setIndex(0);
    setPrevIndex(0);
    setCorrectCount(0);
    setCompleted(false);
    startedAtRef.current = Date.now();
    resetQuestionUI();
  };

  // Replay only the questions answered wrong in the run that just finished.
  const onReviewWrong = () => {
    if (wrongIds.length === 0) return;
    window.sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
    setReviewIds(wrongIds);
    setWrongIds([]);
    setIndex(0);
    setPrevIndex(0);
    setCorrectCount(0);
    setCompleted(false);
    startedAtRef.current = Date.now();
    resetQuestionUI();
  };

  // Back to the Civics hub (the mode picker lives there now). Mid-session
  // progress stays in storage so a later bare /practice visit resumes it;
  // a finished session has nothing to resume, so its keys are cleared.
  const onChangeMode = () => {
    if (completed) {
      window.sessionStorage.removeItem(PRESET_STORAGE_KEY);
      window.sessionStorage.removeItem(CATEGORY_STORAGE_KEY);
    }
    router.push(civicsHubHref);
  };

  if (!hydrated) {
    // Loading skeleton shown until hydration; the auto-start effect then
    // starts the ?start= mode, resumes a stored session, or redirects to the hub.
    return (
      <div
        className="max-w-[1100px] mx-auto w-full animate-pulse motion-reduce:animate-none"
        role="status"
        aria-label={dict.common.loading}
      >
        <div className="h-6 w-48 rounded-lg bg-gray-100 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (preset === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500" role="status" aria-label={dict.common.loading}>
        {dict.common.loading}
      </div>
    );
  }

  if (completed) {
    // "Sai nhiều nhất" only makes sense with 2+ wrongs; a single miss is noise.
    const topCategory = wrongIds.length >= 2 ? mostMissedCategory(wrongIds) : null;
    // A badge/milestone earned on the last answer must survive the swap to the
    // summary screen — replay the celebration here instead of cutting it short.
    return (
      <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
        {unlockedBadges.length > 0 ? (
          <BadgeUnlockToast
            slugs={unlockedBadges}
            catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
            trigger="session_complete"
          />
        ) : null}

        {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

        <PracticeSessionSummary
          correct={correctCount}
          total={order.length}
          wrongCount={wrongIds.length}
          onReviewWrong={onReviewWrong}
          onRetry={onRestart}
          onChangeMode={onChangeMode}
          elapsedSec={elapsedSec}
          topCategory={topCategory ? N400_CATEGORY_LABELS[topCategory] : null}
          sessionsToday={{ done: sessionsToday, goal: DAILY_SESSIONS_GOAL }}
          footer={<GrowthSlot surface="results" />}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      {/* Progress — one calm row (counter · bar · % · time). Session controls
          (change mode / reshuffle) intentionally live off this screen: the app
          header Back button returns to the Civics hub where the mode picker
          lives, keeping the answering surface distraction-free. */}
      <PracticeProgressRow index={index} total={order.length} estimatedMinutes={preset?.minutes} />

      {/* Main area — flex-1, grid on desktop */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question Card — flex-1, immersive */}
        <div
          ref={cardRef}
          tabIndex={-1}
          className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 outline-none focus:ring-0 overflow-hidden"
        >
          {/* Study Body — the only scrollable region */}
          <div
            ref={studyBodyRef}
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Question header — compact on mobile */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Item badge intentionally omitted — the progress row above
                      already tracks position. */}
                  <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1.125rem, 2.6vw, 1.5rem)' }}>
                    {question.questionEn}
                  </div>
                  {lang !== 'en' && (
                    <div className="text-gray-500 mt-1" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                      {question.questionVi}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AudioButton src={questionAudioUrl(question.id)} label={dict.flashcards.listenQuestion} size="sm" />
                  <button
                    type="button"
                    onClick={() => toggleBookmark(question.id)}
                    aria-label={dict.flashcards.bookmark}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      isBookmarked
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>

            {isPersonalizedAnswerUnavailable(question, districtNumber) ? (
              <div className="mb-[clamp(0.5rem,1vw,1rem)]">
                <PersonalizedAnswerNotice from="practice" />
              </div>
            ) : null}

            {/* Answer Options — always one stacked column so the layout stays
                identical before and after answering. The question stays the hero
                and each choice is easy to scan/tap. */}
            <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
              {options.map((opt) => {
                const isPicked = selected === opt.id;
                let style = 'border-gray-200 hover:border-teal-300 bg-white';
                const chip = 'bg-gray-100 text-gray-700';
                let mark = (
                  <span className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0" />
                );

                if (phase === 'revealed') {
                  if (opt.isCorrect) {
                    style = 'border-teal-600 bg-teal-50';
                    mark = <CheckCircle size={22} className="text-teal-600 shrink-0" />;
                  } else if (isPicked) {
                    style = 'border-red-400 bg-red-50';
                    mark = <XCircle size={22} className="text-red-500 shrink-0" />;
                  } else {
                    style = 'border-gray-200 bg-white opacity-70';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={phase === 'revealed'}
                    onClick={() => onPick(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] outline-none focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-100 ${style}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${chip}`} style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{opt.id}</div>
                    <div className="flex-1 text-gray-800 font-medium">
                      <div style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>{opt.en}</div>
                      {lang !== 'en' && opt.vi !== opt.en ? (
                        <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}>{opt.vi}</div>
                      ) : null}
                    </div>
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Learning Tip — mobile only (desktop shows it in the right panel).
                Rendered before answering so the pre-answer screen matches the
                Header → Progress → Question → Choices → Tip mobile order. */}
            {phase !== 'revealed' ? (
              <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
                <LearningTipCard />
              </div>
            ) : null}

            {/* Feedback — full width below the options grid */}
            {phase === 'revealed' && pickedOption && (
              <div
                ref={feedbackRef}
                className={`mt-[clamp(0.5rem,1vh,0.75rem)] rounded-2xl p-[clamp(0.625rem,1.5vh,1rem)] border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none ${
                  pickedOption.isCorrect
                    ? 'bg-teal-50 border-teal-500'
                    : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="text-amber-500 shrink-0" size={16} />
                  <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                    {pickedOption.isCorrect ? dict.practice.correctFeedback : dict.practice.incorrectFeedback}
                  </span>
                  <AudioButton
                    src={answerAudioUrlFor(question, stateCode, districtNumber)}
                    label={dict.flashcards.listenAnswer}
                    size="sm"
                    className="ml-auto"
                  />
                </div>
                <div className="text-gray-700 mb-1" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  <span className="font-semibold">{dict.practice.acceptedAnswers}</span>
                </div>
                <ul className="text-gray-700 space-y-0.5 list-disc pl-5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  {allAnswers.slice(0, 2).map((a, i) => (
                    <li key={i}>
                      <span className="font-medium">{a.en}</span>
                      {lang !== 'en' && a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                    </li>
                  ))}
                </ul>

                {/* Progressive disclosure for 3+ answers */}
                {allAnswers.length > 2 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowAllAnswers(!showAllAnswers); }}
                      className="mt-2 text-teal-600 font-semibold flex items-center gap-1 transition-colors hover:text-teal-700"
                      style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)' }}
                    >
                      {showAllAnswers ? (
                        <><ChevronUp size={14} /> {dict.practice.collapse}</>
                      ) : (
                        <><ChevronDown size={14} /> {tFormat(dict.practice.viewAllAnswers, { count: allAnswers.length })}</>
                      )}
                    </button>
                    {showAllAnswers && (
                      <ul className="text-gray-700 space-y-0.5 list-disc pl-5 mt-1 animate-in fade-in duration-200 motion-reduce:animate-none" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                        {allAnswers.slice(2).map((a, i) => (
                          <li key={i + 2}>
                            <span className="font-medium">{a.en}</span>
                            {lang !== 'en' && a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Pinned Actions — only AFTER answering. Before answering, the single
              task is to select an answer, so nothing competes at the bottom. */}
          {phase === 'revealed' && (
            <div
              className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
            >
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => toggleBookmark(question.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold transition-colors ${
                    isBookmarked
                      ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                  <span className="leading-tight"><span className="sm:hidden">{dict.practice.saveForReviewShort}</span><span className="hidden sm:inline">{dict.practice.saveForReviewFull}</span></span>
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <span>{dict.practice.next}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Support Panel — quiet: one illustration + one Learning Tip. */}
        <PracticeSupportPanel />
      </div>
    </div>
  );
}
