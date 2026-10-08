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
import { finalizeMockAttempt, finalizeVoiceMockAttempt, startMockAttempt } from '../civics/actions';
import { AnswerModeToggle, type PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import type { ExamVoice } from '@/components/n400/oral/use-spoken-exam';
import { answerModeOf } from '@/lib/n400/attempt-row';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { captureOpen } from '@/lib/n400/oral/mock-voice-items';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
import { useN400UserState } from '@/lib/n400/user-state';
import {
  fullCivicsSubmission,
  serverVerdicts,
  startCivicsSave,
  type CivicsSave,
  type CivicsSaveStatus,
  type FullCivicsInput,
} from '@/lib/n400/full-civics-submit';
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

const FULL_TOTAL_COUNT = FULL_CIVICS_COUNT + FULL_SPEAKING_COUNT + FULL_WRITING_COUNT;

// The learner's "Cách trả lời" for the Full interview, remembered for this test
// (speaking spec S8).
const FULL_MODE_KEY = 'n400.mock.full.answerMode';

function readStoredFullMode(): PracticeAnswerMode {
  try {
    return window.localStorage.getItem(FULL_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}

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
  const { state, hydrated, noteMockResult, recordSectionMockResult } = useN400UserState();
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
  // Server-graded Civics part (RLS hardening spec §2.4): the attempt registers
  // at Bắt đầu and finalizes when the part ends. runToken tells a late save
  // from an older run apart from the current one.
  const civicsInputs = useRef<FullCivicsInput[]>([]);
  const runToken = useRef(0);
  const attemptIdPromise = useRef<Promise<string> | null>(null);
  const pendingStart = useRef<Parameters<typeof startMockAttempt>[0] | null>(null);
  const civicsSave = useRef<CivicsSave | null>(null);
  const [civicsSaveStatus, setCivicsSaveStatus] = useState<CivicsSaveStatus | null>(null);

  // Voice (speaking spec §5.2): one choice at the start covers the Civics and
  // Speaking parts; Writing stays typed.
  const mic = useSpeechRecognition();
  const voiceFlags = useVoiceFlags();
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    enabled: voiceFlags.speakingOn,
    androidOn: voiceFlags.androidOn,
  });
  const voiceAvailable = voiceInput !== 'none';
  // Hold the picker's place while the flags load in a browser that can answer by
  // voice, so it doesn't pop in above Bắt đầu (Android waits for voice_android).
  const browserCanVoice = voiceInputFor({ ua, apiPresent: mic.supported, enabled: true, androidOn: false }) !== 'none';
  const pickerPending = !voiceFlags.loaded && browserCanVoice;
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredFullMode());
  // The run's mode, latched at Bắt đầu; the mic-lost latch spans both parts.
  const [runMode, setRunMode] = useState<PracticeAnswerMode>('choice');
  const [micLatched, setMicLatched] = useState(false);

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
    //
    // The new value is computed here, not in a setSeed updater, because the
    // Civics attempt registers with the same `full-${seed}` the quiz builds from.
    const next = seed + 1 + Math.floor(Math.random() * 1_000_000);
    setSeed(next);
    runToken.current = next;
    civicsAnswers.current = [];
    civicsInputs.current = [];
    setCivicsAnswerList([]);
    speakingAnswers.current = [];
    setSpeakingAnswerList([]);
    setWritingAnswerList([]);
    startedAt.current = new Date().toISOString();
    setRunMode(answerMode === 'voice' && voiceAvailable ? 'voice' : 'choice');
    setMicLatched(false);
    setCivics(null);
    setSpeaking(null);
    setWriting(null);
    civicsSave.current = null;
    setCivicsSaveStatus(null);
    // Register the Civics attempt in the background; finishCivics awaits it and
    // retries once if this call failed.
    const args = { kind: 'full' as const, seed: `full-${next}`, stateCode, districtNumber };
    pendingStart.current = args;
    const p = startMockAttempt(args).then((r) => r.attemptId);
    p.catch(() => {}); // surfaced when the part finalizes
    attemptIdPromise.current = p;
    setPhase({ kind: 'civics' });
  };

  // begin() already reshuffles via its seed bump — no double bump here.
  const retake = () => {
    setPhase({ kind: 'intro' });
  };

  const examVoice: ExamVoice | undefined =
    runMode === 'voice'
      ? { input: voiceInput, micLost: micLatched, onMicLost: () => setMicLatched(true), context: 'full' }
      : undefined;

  const onModeChange = (m: PracticeAnswerMode) => {
    setAnswerMode(m);
    try {
      window.localStorage.setItem(FULL_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
  };

  // 🔊 on the review screen while an iOS session may still be open (Civics rev 3.12).
  const beforeAudio = () => {
    if (captureOpen(mic.state)) mic.reset();
    mic.noteAudioPlayed();
  };

  // The part's result shows at once from the quiz; the server's verdicts replace
  // it when the finalize lands, normally long before the summary (spec §2.4).
  const finishCivics = () => {
    const run = runToken.current;
    const answers = [...civicsAnswers.current];
    const submission = fullCivicsSubmission(runMode, civicsInputs.current);
    const startedAtIso = startedAt.current;
    // This run's start, captured before anything is awaited: a restart replaces
    // the refs, and a late retry must never finalize (or create) the next run's
    // attempt.
    const startPromise = attemptIdPromise.current;
    const startArgs = pendingStart.current;
    let attemptId: string | null = null;
    const save = async () => {
      if (!attemptId) {
        attemptId = startPromise ? await startPromise.catch(() => null) : null;
        if (!attemptId && startArgs) attemptId = (await startMockAttempt(startArgs)).attemptId;
        if (!attemptId) throw new Error('n400: Full interview Civics attempt never registered');
      }
      const id = attemptId;
      const r =
        submission.mode === 'voice'
          ? await finalizeVoiceMockAttempt(id, submission.answers, 'full')
          : await finalizeMockAttempt(id, submission.picks, 'full');
      return { id, r };
    };
    civicsSave.current = startCivicsSave(save, (status, saved) => {
      if (runToken.current !== run) return; // a newer run started
      setCivicsSaveStatus(status);
      if (status !== 'saved' || !saved) return;
      const { id, r } = saved;
      const verdicts = serverVerdicts(submission, r);
      const reviewed = answers.map((a) => ({ ...a, wasCorrect: verdicts.get(a.questionId) ?? false }));
      setCivics({ correct: r.score, total: r.total, passed: r.passed });
      setCivicsAnswerList(reviewed);
      noteMockResult(
        {
          id,
          startedAt: startedAtIso,
          completedAt: new Date().toISOString(),
          score: r.score,
          total: r.total,
          passed: r.passed,
          questionResults: reviewed.map(({ questionId, wasCorrect, transcript }) => ({
            questionId,
            wasCorrect,
            ...(transcript !== undefined ? { transcript } : {}),
          })),
        },
        { current: r.currentStreak, longest: r.longestStreak },
      );
    });
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
        examVoice={examVoice}
        onAnswer={(itemId, ok, selected, _via, spoken) => {
          const questionId = Number(itemId.slice(4));
          civicsAnswers.current.push({
            questionId,
            wasCorrect: ok,
            selectedEn: selected?.en,
            ...(spoken ? { transcript: spoken.transcript, input: spoken.input } : {}),
          });
          civicsInputs.current.push({
            questionId,
            ...(selected ? { selectedId: selected.id } : {}),
            ...(spoken ? { spoken } : {}),
          });
        }}
        onComplete={({ correct }) => {
          const passed = correct >= FULL_CIVICS_PASS;
          setCivics({ correct, total: FULL_CIVICS_COUNT, passed });
          setCivicsAnswerList([...civicsAnswers.current]);
          // Advance first; the server save runs in the background (spec §2.4).
          setPhase({ kind: 'interlude', next: 'speaking' });
          finishCivics();
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
        examVoice={examVoice}
        onAnswer={(itemId, ok, selected, _via, spoken) =>
          speakingAnswers.current.push({
            itemId,
            wasCorrect: ok,
            selectedEn: selected?.en,
            ...(spoken ? { transcript: spoken.transcript, input: spoken.input } : {}),
          })
        }
        onComplete={({ correct }) => {
          const passed = correct >= FULL_SPEAKING_PASS;
          setSpeaking({ correct, total: FULL_SPEAKING_COUNT, passed });
          setSpeakingAnswerList([...speakingAnswers.current]);
          setPhase({ kind: 'interlude', next: 'writing' });
          void recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT, answerModeOf(speakingAnswers.current.map((a) => a.input)));
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
          civicsSave.current?.retryIfFailed();
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
        civicsUnsaved={civicsSaveStatus === 'unsaved'}
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
        onBeforePlay={beforeAudio}
        preferWebAudio={mic.sessionRunning}
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

      {/* Cách trả lời (speaking spec §5.2): only when voice is available here */}
      {voiceAvailable || pickerPending ? (
        <div className="mt-5 rounded-2xl border border-slate-100 p-4 text-left sm:p-5">
          <p className="mb-2 text-sm font-semibold text-gray-700">{dict.oral.mockModeLabel}</p>
          <AnswerModeToggle
            mode={answerMode}
            onChange={onModeChange}
            labels={{ choice: dict.oral.modeChoice, voice: dict.oral.fullModeVoice }}
            disabled={pickerPending}
          />
          <p className="mt-2 text-xs text-gray-500">{dict.oral.fullModeNote}</p>
        </div>
      ) : null}

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
