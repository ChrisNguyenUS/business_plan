'use client';

// Thi thử Speaking — hybrid speaking mock test. Combines 5 What Mean
// multiple-choice items with 5 Yes/No items into a single shuffled 10-question
// session. Chrome reuses the exact Speaking-section quiz layout (progress strip,
// question card, pinned Next, decorative sidebar); the two card bodies (A/B/C/D
// grid vs Yes/No buttons) are branched per item. Pass rule: answer ≥ 8 / 10.
//
// Exam semantics: picking only selects (re-pickable); grading happens silently
// on Tiếp theo and the answer is never revealed mid-run — the score surfaces
// on the result screen only, like the real interview.
//
// Voice run (speaking spec §5.1): when voice is available here, an intro offers
// "Cách trả lời". A voice run answers every item through the Civics mock panel
// ([Đúng vậy] locks, [Nói lại] once) and is graded at the finish; a Yes/No
// answer that is neither yes nor no is asked again. Without voice the test
// starts directly in Trắc nghiệm, as before.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';
import { MockExamProgress, MockExamPanel, MockExamRulesCard } from '@/components/n400/mock-test-chrome';
import type { PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { MicAnswerPanel } from '@/components/n400/oral/MicAnswerPanel';
import { SpeakingMockIntro } from '@/components/n400/speaking/SpeakingMockIntro';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
} from '@/lib/n400/quiz-engine';
import { gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { mockItemInput, offersTypedFallback, voiceRunMicLost } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, mockReaskEvent, speakingMockAnswerEvents } from '@/lib/n400/oral/oral-events';
import { gradeSpokenMock, mockConfirm, mockRetry, type SpokenMockAnswer } from '@/lib/n400/oral/spoken-mock';
import { spokenQid, spokenSection } from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

const MC_COUNT = 5;
const YESNO_COUNT = 5;
const TOTAL = MC_COUNT + YESNO_COUNT;
const PASS_THRESHOLD = 8; // đúng ≥ 8/10 là đạt
// The learner's "Cách trả lời" for this test, remembered apart from the Civics
// mock's (speaking spec S8).
const SPEAKING_MOCK_MODE_KEY = 'n400.mock.speaking.answerMode';

type Choice = 'yes' | 'no';

interface McItem {
  kind: 'mc';
  id: string;
  badge: string;
  headerEn: string;
  headerVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  options: { id: 'A' | 'B' | 'C' | 'D'; en: string; isCorrect: boolean }[];
  accepted: { en: string; vi: string };
}

interface YesNoItem {
  kind: 'yesno';
  id: string;
  num: number;
  questionEn: string;
  questionVi: string;
  answer: Choice;
  audioSrc: string | null;
}

type MockItem = McItem | YesNoItem;

/** iOS 🔊 rules (Civics rev 3.12) for the question 🔊 on this screen. */
interface AudioRules {
  onBeforePlay: () => void;
  preferWebAudio: () => boolean;
  /** The slow 🔊 plays through <audio>, which deafens an open iOS mic session. */
  showSlow: boolean;
}

function readStoredMode(): PracticeAnswerMode {
  try {
    return window.localStorage.getItem(SPEAKING_MOCK_MODE_KEY) === 'voice' ? 'voice' : 'choice';
  } catch {
    return 'choice';
  }
}

function buildItems(seed: number, dict: N400Dict): MockItem[] {
  const mc: McItem[] = shuffle([...WHATMEAN_QUESTIONS], `mock-spk-wm-${seed}`)
    .slice(0, MC_COUNT)
    .map((q) => ({
      kind: 'mc',
      id: q.id,
      badge: tFormat(dict.speaking.whatmean.badge, { num: q.num }),
      headerEn: q.termEn,
      headerVi: q.questionVi,
      questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
      answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
      options: buildWhatMeanOptions(q, `${seed}-${q.id}`).map((o) => ({
        id: o.id,
        en: o.text,
        isCorrect: o.isCorrect,
      })),
      accepted: { en: q.definitionEn, vi: q.definitionVi },
    }));

  const yesno: YesNoItem[] = shuffle([...YESNO_QUESTIONS], `mock-spk-yn-${seed}`)
    .slice(0, YESNO_COUNT)
    .map((q) => ({
      kind: 'yesno',
      id: q.id,
      num: q.num,
      questionEn: q.questionEn,
      questionVi: q.questionVi,
      answer: q.answer,
      audioSrc: yesNoAudioUrl(q.num),
    }));

  return shuffle([...mc, ...yesno], `mock-spk-mix-${seed}`);
}

/** A voice-run result row: what the learner said or typed, and the accepted answer. */
function voiceRow(item: MockItem, i: number, answer: SpokenMockAnswer | null, ok: boolean, dict: N400Dict): MockResultRow {
  const said = {
    userAnswer: answer?.confirmed ? answer.transcript : null,
    userAnswerLabel: answer?.input === 'typed' ? dict.oral.youTyped : dict.oral.youSaid,
    ok,
  };
  if (item.kind === 'mc') {
    return {
      key: `${i}-${item.id}`,
      badge: tFormat(dict.mockTest.speakingMock.mcBadge, { index: i + 1, badge: item.badge }),
      prompt: item.headerEn,
      promptVi: item.headerVi,
      correctAnswer: item.accepted.en,
      correctAnswerVi: item.accepted.vi,
      audioSrc: item.questionAudioSrc,
      ...said,
    };
  }
  return {
    key: `${i}-${item.id}`,
    badge: tFormat(dict.mockTest.speakingMock.ynBadge, { index: i + 1, num: item.num }),
    prompt: item.questionEn,
    promptVi: item.questionVi,
    correctAnswer: item.answer === 'yes' ? 'Yes, officer' : 'No, officer',
    audioSrc: item.audioSrc,
    ...said,
  };
}

export default function ThiThuSpeakingPage() {
  const { dict } = useN400Lang();
  const { state, recordSectionMockResult } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };

  const [seed, setSeed] = useState(0);
  const items = useMemo(() => buildItems(seed, dict), [seed, dict]);

  const [index, setIndex] = useState(0);
  const [pickedMc, setPickedMc] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [pickedYn, setPickedYn] = useState<Choice | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Per-question verdicts collected as each answer is graded — feeds the
  // result screen's answer sheet (the learner never sees them mid-run).
  const [answers, setAnswers] = useState<MockResultRow[]>([]);
  const [finished, setFinished] = useState(false);

  // Voice (speaking spec §5.1): voice_speaking + this browser decide whether the
  // intro offers "Cách trả lời".
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
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>(() => readStoredMode());
  // The run's mode, latched at start. Without voice here the test starts directly
  // in Trắc nghiệm once the flags are known (derived, latched on the first pick).
  const [startedMode, setStartedMode] = useState<PracticeAnswerMode | null>(null);
  const runMode: PracticeAnswerMode | null =
    startedMode ?? (voiceFlags.loaded && !voiceAvailable ? 'choice' : null);
  const [voiceAnswers, setVoiceAnswers] = useState<(SpokenMockAnswer | null)[]>([]);
  // A lost mic (denied, unavailable, deaf) types the rest of the test. Derived, so
  // the typed box shows at once; latched in the handlers, because the next item's
  // mic reset clears the error.
  const [micLatched, setMicLatched] = useState(false);
  const lostNow = runMode === 'voice' && voiceRunMicLost(voiceInput, mic.error, mic.supported);
  const micLost = micLatched || lostNow;
  const latchMicLost = () => {
    if (lostNow) setMicLatched(true);
  };
  const itemInput = mockItemInput(voiceInput, micLost);

  const item = items[index];
  const spoken = item ? spokenItemFromId(item.id) : null;
  const voiceHere = runMode === 'voice' && spoken !== null;
  const current = voiceAnswers[index] ?? null;

  // A new item never inherits the previous item's capture window.
  const { reset: resetMic } = mic;
  useEffect(() => {
    resetMic();
  }, [index, resetMic]);

  // n400_oral_answer for mic errors during a voice run (spec §8).
  const micError = mic.error;
  useEffect(() => {
    if (!micError || !voiceHere || finished || !spoken) return;
    trackOralAnswer(micErrorEvent(spokenQid(spoken), 'mock', micError, spokenSection(spoken)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  // 🔊 while a capture window is open would be heard as the answer (speaking S2):
  // drop the window, then let the controller note the playback.
  const beforeAudio = () => {
    if (mic.state === 'listening') resetMic();
    mic.noteAudioPlayed();
  };
  const audio: AudioRules = {
    onBeforePlay: beforeAudio,
    preferWebAudio: mic.sessionRunning,
    showSlow: runMode !== 'voice' && !mic.sessionRunning(),
  };

  const retake = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setPickedMc(null);
    setPickedYn(null);
    setCorrectCount(0);
    setAnswers([]);
    setFinished(false);
    setVoiceAnswers([]);
    setMicLatched(false);
  };

  const onModeChange = (m: PracticeAnswerMode) => {
    setAnswerMode(m);
    try {
      window.localStorage.setItem(SPEAKING_MOCK_MODE_KEY, m);
    } catch {
      // Private mode — the choice lasts for this page only.
    }
  };

  if (finished) {
    return (
      <MockResultScreen
        passed={correctCount >= PASS_THRESHOLD}
        score={correctCount}
        total={TOTAL}
        requirement={tFormat(dict.mockTest.speakingMock.requirement, { need: PASS_THRESHOLD, total: TOTAL })}
        passSubtitle={dict.mockTest.speakingMock.passSubtitle}
        onRetake={retake}
        rows={answers}
        reviewHref={`/n400ready/study`}
        reviewLabel={dict.mockTest.speakingMock.reviewLabel}
        reviewTip={dict.mockTest.speakingMock.reviewTip}
        hubHref={`/n400ready/mock-test`}
        onBeforePlay={beforeAudio}
        preferWebAudio={mic.sessionRunning}
      />
    );
  }

  if (runMode === null) {
    // The flags decide whether there is an intro: wait for them (Civics rev 3.14).
    if (!voiceFlags.loaded) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in duration-300">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
          <p className="text-sm font-medium text-gray-600">{dict.mockTest.intro.preparingQuestions}</p>
        </div>
      );
    }
    return (
      <SpeakingMockIntro
        mode={answerMode}
        onModeChange={onModeChange}
        onStart={() => setStartedMode(answerMode === 'voice' ? 'voice' : 'choice')}
      />
    );
  }

  if (!item) return null;

  const isLast = index === items.length - 1;
  const hasPick = item.kind === 'mc' ? pickedMc !== null : pickedYn !== null;
  const ready = voiceHere ? current?.confirmed === true : hasPick;

  // Picking only selects — re-pickable until Tiếp theo, no grading yet.
  const onPickMc = (id: 'A' | 'B' | 'C' | 'D') => {
    if (item.kind !== 'mc') return;
    if (startedMode === null) setStartedMode('choice');
    setPickedMc(id);
  };

  const onPickYn = (choice: Choice) => {
    if (item.kind !== 'yesno') return;
    if (startedMode === null) setStartedMode('choice');
    setPickedYn(choice);
  };

  const onVoiceConfirm = (text: string) => {
    latchMicLost();
    if (!spoken) return;
    const next = mockConfirm(current, text, itemInput, gradeSpokenItem(spoken, text, location).verdict);
    setVoiceAnswers((prev) => {
      const out = [...prev];
      out[index] = next;
      return out;
    });
    // Yes/No neither yes nor no: asked again, the retry kept (spec §5.1, §10).
    if (next.reask) {
      trackOralAnswer(mockReaskEvent(spoken, itemInput, next.retried, text));
      resetMic();
    }
  };

  const onVoiceRetry = () => {
    latchMicLost();
    setVoiceAnswers((prev) => {
      const out = [...prev];
      out[index] = mockRetry(itemInput);
      return out;
    });
  };

  // Voice run: graded at the finish, near counts as wrong (spec §5.1, D8).
  const finishVoice = () => {
    const spokenItems = items.map((it) => spokenItemFromId(it.id));
    const graded = gradeSpokenMock(spokenItems, voiceAnswers, location);
    setAnswers(items.map((it, i) => voiceRow(it, i, voiceAnswers[i] ?? null, graded.ok[i], dict)));
    setCorrectCount(graded.score);
    setFinished(true);
    resetMic();
    for (const e of speakingMockAnswerEvents(spokenItems, voiceAnswers, graded.ok)) trackOralAnswer(e);
    void recordSectionMockResult('speaking', graded.score >= PASS_THRESHOLD, graded.score, TOTAL, graded.answerMode);
  };

  const onNext = () => {
    if (voiceHere) {
      if (!ready) return;
      latchMicLost();
      if (isLast) {
        finishVoice();
        return;
      }
      setIndex((i) => i + 1);
      return;
    }
    if (!hasPick) return;
    // Grade silently on advance; the learner never sees per-question results.
    const wasCorrect =
      item.kind === 'mc'
        ? !!item.options.find((o) => o.id === pickedMc)?.isCorrect
        : pickedYn === item.answer;
    const row: MockResultRow =
      item.kind === 'mc'
        ? {
            key: `${index}-${item.id}`,
            badge: tFormat(dict.mockTest.speakingMock.mcBadge, { index: index + 1, badge: item.badge }),
            prompt: item.headerEn,
            promptVi: item.headerVi,
            userAnswer: item.options.find((o) => o.id === pickedMc)?.en ?? null,
            correctAnswer: item.options.find((o) => o.isCorrect)?.en ?? item.accepted.en,
            correctAnswerVi: item.accepted.vi,
            ok: wasCorrect,
            audioSrc: item.questionAudioSrc,
          }
        : {
            key: `${index}-${item.id}`,
            badge: tFormat(dict.mockTest.speakingMock.ynBadge, { index: index + 1, num: item.num }),
            prompt: item.questionEn,
            promptVi: item.questionVi,
            userAnswer: pickedYn === 'yes' ? 'Yes, officer' : 'No, officer',
            correctAnswer: item.answer === 'yes' ? 'Yes, officer' : 'No, officer',
            ok: wasCorrect,
            audioSrc: item.audioSrc,
          };
    setAnswers((prev) => [...prev, row]);
    const newCount = correctCount + (wasCorrect ? 1 : 0);
    setCorrectCount(newCount);
    if (isLast) {
      setFinished(true);
      void recordSectionMockResult('speaking', newCount >= PASS_THRESHOLD, newCount, TOTAL);
      return;
    }
    setIndex((i) => i + 1);
    setPickedMc(null);
    setPickedYn(null);
  };

  // A voice item is answered through the Civics mock panel: [Đúng vậy] locks,
  // [Nói lại] once; a re-ask or a mic error keeps the retry (spec §5.1).
  const voicePanel: ReactNode = voiceHere ? (
    <MicAnswerPanel
      key={item.id}
      variant="mock"
      input={itemInput}
      mic={mic}
      locked={current?.confirmed === true}
      nearAnswer={null}
      canRetry={!current?.retried}
      onRetry={onVoiceRetry}
      onSubmit={onVoiceConfirm}
      onNearAnswer={() => {}}
      prompt={current?.reask ? dict.oral.yesNoReask : undefined}
      notice={micLost ? dict.oral.micLostTyped : undefined}
      onUseTyped={offersTypedFallback(mic.error) && !micLost ? () => setMicLatched(true) : undefined}
    />
  ) : null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress — calm exam card: counter · bar · questions remaining */}
      <MockExamProgress index={index} total={TOTAL} />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Question card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {item.kind === 'mc' ? (
              <McBody item={item} picked={pickedMc} onPick={onPickMc} audio={audio} answer={voicePanel} />
            ) : (
              <YesNoBody item={item} picked={pickedYn} onPick={onPickYn} audio={audio} answer={voicePanel} />
            )}

            {/* Mobile Exam Rules (desktop shows it in the right rail) */}
            <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
              <MockExamRulesCard />
            </div>
          </div>

          {/* Pinned actions — no Xem đáp án in a mock test */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            <NextButton disabled={!ready} onClick={onNext} isLast={isLast} />
          </div>
        </div>

        {/* Right rail — exam illustration + Exam Rules */}
        <MockExamPanel mode="speaking" />
      </div>
    </div>
  );
}

function NextButton({
  disabled,
  onClick,
  isLast,
}: {
  disabled: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  const { dict } = useN400Lang();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all ${
        disabled
          ? 'cursor-not-allowed bg-teal-600/20 text-teal-700/50 shadow-none'
          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
      }`}
      style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
    >
      <span>{isLast ? dict.mockTest.submitButton : 'Next'}</span>
      <ArrowRight size={16} />
    </button>
  );
}

function McBody({
  item,
  picked,
  onPick,
  audio,
  answer,
}: {
  item: McItem;
  picked: 'A' | 'B' | 'C' | 'D' | null;
  onPick: (id: 'A' | 'B' | 'C' | 'D') => void;
  audio: AudioRules;
  /** The voice panel in a voice run; the options otherwise. */
  answer: ReactNode;
}) {
  const { dict } = useN400Lang();
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.headerEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton
              src={item.questionAudioSrc}
              label={dict.flashcards.listenQuestion}
              size="sm"
              onBeforePlay={audio.onBeforePlay}
              preferWebAudio={audio.preferWebAudio}
            />
            {audio.showSlow ? (
              <AudioButton src={item.questionAudioSrc} label={dict.mockTest.slowSpeakLabel} size="sm" rate={0.7} variant="slow" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Answer — the voice panel in a voice run; otherwise the options, a calm
          stacked column with the chip + radio on the right */}
      {answer ?? (
        <div className="grid grid-cols-1 gap-[clamp(0.5rem,1.2vh,0.75rem)]">
          {item.options.map((opt) => {
            const isPicked = picked === opt.id;
            // Selected-but-ungraded: teal highlight with a filled radio — no ✓/✗
            // so nothing hints at correctness before the test is over.
            const style = isPicked
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 bg-white';
            const mark = isPicked ? (
              <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
            );

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPick(opt.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(56px,7vh,72px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                  {opt.id}
                </div>
                <div className="flex-1 text-gray-800 font-medium" style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>
                  {opt.en}
                </div>
                {mark}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function YesNoBody({
  item,
  picked,
  onPick,
  audio,
  answer,
}: {
  item: YesNoItem;
  picked: Choice | null;
  onPick: (choice: Choice) => void;
  audio: AudioRules;
  /** The voice panel in a voice run; the Yes/No buttons otherwise. */
  answer: ReactNode;
}) {
  const { dict } = useN400Lang();
  const choices: { id: Choice; label: string }[] = [
    { id: 'yes', label: 'Yes, officer' },
    { id: 'no', label: 'No, officer' },
  ];
  return (
    <>
      {/* Header */}
      <div className="mb-[clamp(0.5rem,1vw,1rem)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Question position intentionally omitted — the progress row above
                already tracks it. */}
            <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
              {item.questionEn}
            </div>
            {/* English only while taking — Vietnamese gloss appears in the result. */}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AudioButton
              src={item.audioSrc}
              label={dict.flashcards.listenQuestion}
              size="sm"
              onBeforePlay={audio.onBeforePlay}
              preferWebAudio={audio.preferWebAudio}
            />
            {audio.showSlow ? (
              <AudioButton src={item.audioSrc} label={dict.mockTest.slowSpeakLabel} size="sm" rate={0.7} variant="slow" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Answer — the voice panel in a voice run; otherwise Yes / No */}
      {answer ?? (
        <div className="grid grid-cols-2 gap-[clamp(0.375rem,1vh,0.625rem)]">
          {choices.map((choice) => {
            const isPicked = picked === choice.id;
            // Selected-but-ungraded: teal highlight, no ✓/✗ before the test ends.
            const style = isPicked
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-200 hover:border-teal-300 bg-white';
            const mark = isPicked ? (
              <span className="w-6 h-6 rounded-full border-[7px] border-teal-600 bg-white shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
            );

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onPick(choice.id)}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 text-center transition-all duration-200 motion-reduce:duration-0 min-h-[clamp(52px,7vh,68px)] p-[clamp(0.5rem,1.2vh,0.875rem)] ${style}`}
              >
                <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                  {choice.label}
                </span>
                {mark}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
