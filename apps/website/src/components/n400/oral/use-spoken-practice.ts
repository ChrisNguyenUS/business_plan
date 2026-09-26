'use client';

// Spoken answers in Speaking practice (speaking spec §4). It covers:
// - the [Trắc nghiệm | Tự nói] switch and the shared mic session;
// - grading through gradeSpokenItem;
// - the practice rules: near → "Có phải bạn nói …?" (never recorded when
//   confirmed, D7); Yes/No unclear → re-ask;
// - the iOS 🔊 rules.
// Shared by SectionYesNoQuiz and SectionMCQuiz. The rules are pure
// (spoken-practice.ts). This hook holds the state and sends the events; it never
// sets state during render or in an effect.

import { useEffect, useState } from 'react';
import type { PracticeAnswerMode } from '@/components/n400/oral/AnswerModeToggle';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { offersTypedFallback } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, practiceAnswerEvent } from '@/lib/n400/oral/oral-events';
import {
  afterAttempt,
  afterNearAnswer,
  answerFor,
  freshAnswer,
  isLocked,
  spokenInput,
  spokenPracticeStep,
  spokenQid,
  spokenSection,
} from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition, type SpeechApi } from '@/lib/n400/oral/use-speech-recognition';
import { useVoiceFlags } from '@/lib/n400/oral/use-voice-flags';
import { voiceInputFor } from '@/lib/n400/oral/voice-support';
import { useN400UserState } from '@/lib/n400/user-state';

export interface SpokenSettle {
  shownCorrect: boolean;
  /** null = record nothing (a confirmed near, D7). */
  record: boolean | null;
  via: 'voice' | 'typed';
}

export interface SpokenPractice {
  mic: SpeechApi;
  /** Show [Trắc nghiệm | Tự nói]: the flag is on and this browser can answer by voice or typing. */
  showToggle: boolean;
  answerMode: PracticeAnswerMode;
  changeMode: (m: PracticeAnswerMode) => void;
  /** This item is answered by voice/typing (chosen, available, gradable, or already graded). */
  voiceHere: boolean;
  panelInput: 'mic' | 'typed';
  micLost: boolean;
  /** Offered after a network / audio-capture error: switch to typing. */
  typedFallback: (() => void) | undefined;
  voiceText: string;
  /** Graded (or waiting for the near answer): no more speaking or typing. */
  locked: boolean;
  shownCorrect: boolean;
  /** The taught answer to offer in "Có phải bạn nói …?"; null otherwise. */
  nearPrompt: string | null;
  /** Yes/No unclear: show the re-ask prompt. */
  reask: boolean;
  onSubmit: (text: string) => void;
  onNearAnswer: (yes: boolean) => void;
  /** Pass to every 🔊 as onBeforePlay. */
  beforeAudio: () => void;
}

export function useSpokenPractice(opts: {
  itemId: string | null;
  /** False in exam mode: the Full interview decides voice itself (slice S4). */
  enabled: boolean;
  onSettle: (s: SpokenSettle) => void;
}): SpokenPractice {
  const mic = useSpeechRecognition();
  const flags = useVoiceFlags();
  const { state } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };
  const item = opts.itemId ? spokenItemFromId(opts.itemId) : null;

  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const voiceInput = voiceInputFor({
    ua,
    apiPresent: mic.supported,
    enabled: opts.enabled && flags.speakingOn,
    androidOn: flags.androidOn,
  });

  // Every practice session starts in Trắc nghiệm: the page remounts the quiz per
  // session. Within one, Tự nói stays on from item to item (spec S8, rev 1.1).
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>('choice');
  // One answer, tagged with its item: a new item starts clean by itself.
  const [stored, setStored] = useState(() => freshAnswer(opts.itemId));
  const answer = answerFor(stored, opts.itemId);
  const [micLatched, setMicLatched] = useState(false);

  // A new item never inherits the previous item's capture window. The mic is an
  // external system: this effect resets it and sets no React state.
  const { reset: resetMic } = mic;
  useEffect(() => {
    resetMic();
  }, [opts.itemId, resetMic]);

  const locked = isLocked(answer);
  const voiceHere =
    locked || (voiceInput !== 'none' && answerMode === 'voice' && item !== null && canSpeak(item, location));

  // A stalled mic (deaf iOS session) → the typed box for the rest of the session
  // (Civics rev 3.11). Derived, so the typed box shows at once; latched in the
  // handlers, because the next item's mic reset clears the error.
  const stalled = voiceHere && voiceInput === 'mic' && mic.error === 'stalled';
  const micLost = micLatched || stalled;
  const latchMicLost = () => {
    if (stalled) setMicLatched(true);
  };
  const { panelInput, via } = spokenInput(voiceInput, micLost);

  // n400_oral_answer for mic errors (Civics spec §9), with this item's section.
  const micError = mic.error;
  useEffect(() => {
    if (micError && answerMode === 'voice' && item) {
      trackOralAnswer(micErrorEvent(spokenQid(item), 'practice', micError, spokenSection(item)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  const onSubmit = (text: string) => {
    latchMicLost();
    if (!item) return;
    const grade = gradeSpokenItem(item, text, location);
    const next = afterAttempt(answer, text, grade);
    if (next === answer) return; // already graded
    setStored(next);
    // A near is sent once the learner answers "Có phải bạn nói …?" (onNearAnswer).
    if (grade.verdict !== 'near') {
      trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, grade.verdict, null, text, spokenSection(item)));
    }
    // Yes/No unclear: nothing counted or recorded; the mic is ready for another try.
    if (next.reask) {
      resetMic();
      return;
    }
    const step = spokenPracticeStep(next);
    if (step.settle) opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const onNearAnswer = (yes: boolean) => {
    if (!item) return;
    const next = afterNearAnswer(answer, yes);
    if (next === answer) return;
    setStored(next);
    // D7: no attempt row, but the event is sent (confirmedNear, Civics spec §9).
    trackOralAnswer(practiceAnswerEvent(spokenQid(item), panelInput, 'near', yes, answer.text, spokenSection(item)));
    const step = spokenPracticeStep(next);
    opts.onSettle({ shownCorrect: step.shownCorrect, record: step.record, via });
  };

  const changeMode = (m: PracticeAnswerMode) => {
    if (locked) return;
    latchMicLost();
    setAnswerMode(m);
    setStored(freshAnswer(opts.itemId));
    resetMic();
  };

  // 🔊 while a capture window is open would be graded as the answer (S1 final
  // review): drop the window first, then let the controller note the playback.
  const beforeAudio = () => {
    if (mic.state === 'listening') resetMic();
    mic.noteAudioPlayed();
  };

  return {
    mic,
    showToggle: voiceInput !== 'none',
    answerMode,
    changeMode,
    voiceHere,
    panelInput,
    micLost,
    typedFallback: panelInput === 'mic' && offersTypedFallback(mic.error) ? () => setMicLatched(true) : undefined,
    voiceText: answer.text,
    locked,
    shownCorrect: spokenPracticeStep(answer).shownCorrect,
    nearPrompt: answer.verdict === 'near' && answer.nearAnswer === null ? answer.nearPrompt : null,
    reask: answer.reask,
    onSubmit,
    onNearAnswer,
    beforeAudio,
  };
}
