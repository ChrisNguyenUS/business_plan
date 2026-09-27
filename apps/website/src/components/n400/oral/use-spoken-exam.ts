'use client';

// Spoken answers inside an exam run (speaking spec §5.2). The Full interview's Civics
// and Speaking parts answer through the §5.1 mock item: [Đúng vậy] locks, [Nói lại]
// once, a Yes/No "unclear" is asked again, and nothing is graded before Next (no
// verdict mid-test). The rules are pure (spoken-mock.ts, mock-voice-items.ts); this
// hook holds one item's answer and sends the events. It never sets state during
// render or in an effect.

import { useEffect, useState } from 'react';
import { trackOralAnswer } from '@/lib/n400/analytics';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from '@/lib/n400/oral/grade-spoken-item';
import { mockItemInput, offersTypedFallback, voiceRunMicLost } from '@/lib/n400/oral/mock-voice-items';
import { micErrorEvent, mockReaskEvent, spokenAnswerEvent } from '@/lib/n400/oral/oral-events';
import { mockConfirm, mockRetry, type SpokenMockAnswer } from '@/lib/n400/oral/spoken-mock';
import { spokenQid, spokenSection } from '@/lib/n400/oral/spoken-practice';
import { useSpeechRecognition } from '@/lib/n400/oral/use-speech-recognition';
import type { VoiceInput } from '@/lib/n400/oral/voice-support';
import { useN400UserState } from '@/lib/n400/user-state';

/** A voice run, decided by the page at start (speaking spec §5.2). */
export interface ExamVoice {
  /** How this browser answers: 'mic', or 'typed' in in-app browsers (voiceInputFor with the flags). */
  input: VoiceInput;
  /** Latched by the page across parts: the run's mic is lost, so every remaining voice item types. */
  micLost: boolean;
  onMicLost: () => void;
  /** n400_oral_answer context. */
  context: 'mock' | 'full';
}

export interface SpokenExam {
  /** This item is answered by voice or typing: a voice run and an item that can be spoken. */
  voiceHere: boolean;
  itemInput: 'mic' | 'typed';
  micLost: boolean;
  /** This item's answer so far; null before the first confirm or retry. */
  current: SpokenMockAnswer | null;
  onConfirm: (text: string) => void;
  onRetry: () => void;
  /** Offered after a network / audio-capture error: type the rest of the run. */
  typedFallback: (() => void) | undefined;
  /** At Next: grade the confirmed answer and send its event; null until it is confirmed. */
  settle: () => { wasCorrect: boolean; answer: SpokenMockAnswer } | null;
}

export function useSpokenExam(opts: { itemId: string | null; voice: ExamVoice | undefined }): SpokenExam {
  const { itemId, voice } = opts;
  const mic = useSpeechRecognition();
  const { state } = useN400UserState();
  const location = { stateCode: state.settings.stateCode, districtNumber: state.address.districtNumber };
  const item = voice && itemId ? spokenItemFromId(itemId) : null;
  const voiceHere = voice !== undefined && item !== null && canSpeak(item, location);

  // One answer, tagged with its item: the next item starts clean by itself.
  const [stored, setStored] = useState<{ itemId: string; answer: SpokenMockAnswer } | null>(null);
  const current = stored !== null && stored.itemId === itemId ? stored.answer : null;

  // A lost mic types the rest of the run. Derived here; the page latches it (it spans
  // both parts) from the handlers, because the next item's mic reset clears the error.
  const lostNow = voiceHere && voice !== undefined && voiceRunMicLost(voice.input, mic.error, mic.supported);
  const micLost = (voice?.micLost ?? false) || lostNow;
  const latchMicLost = () => {
    if (lostNow) voice?.onMicLost();
  };
  const itemInput = mockItemInput(voice?.input ?? 'none', micLost);
  const { reset: resetMic } = mic;

  // A new item never inherits the previous item's capture window. Its own reset,
  // so it doesn't depend on the practice hook's; the mic is an external system and
  // resetting it sets no React state.
  useEffect(() => {
    resetMic();
  }, [itemId, resetMic]);

  // n400_oral_answer for mic errors during a voice run (speaking spec §8).
  const micError = mic.error;
  useEffect(() => {
    if (!micError || !voiceHere || !item || !voice) return;
    trackOralAnswer(micErrorEvent(spokenQid(item), voice.context, micError, spokenSection(item)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micError]);

  const onConfirm = (text: string) => {
    latchMicLost();
    if (!item || !itemId || !voice) return;
    const next = mockConfirm(current, text, itemInput, gradeSpokenItem(item, text, location).verdict);
    setStored({ itemId, answer: next });
    // Yes/No neither yes nor no: asked again, the retry kept (speaking spec §5.1, §10).
    if (next.reask) {
      trackOralAnswer(mockReaskEvent(item, itemInput, next.retried, text, voice.context));
      resetMic();
    }
  };

  const onRetry = () => {
    latchMicLost();
    if (!itemId) return;
    setStored({ itemId, answer: mockRetry(itemInput) });
  };

  const settle = () => {
    if (!item || !voice || current === null || !current.confirmed) return null;
    latchMicLost();
    const wasCorrect = gradeSpokenItem(item, current.transcript, location).verdict === 'correct';
    trackOralAnswer(spokenAnswerEvent(item, current, wasCorrect, voice.context));
    return { wasCorrect, answer: current };
  };

  return {
    voiceHere,
    itemInput,
    micLost,
    current,
    onConfirm,
    onRetry,
    typedFallback: voiceHere && !micLost && offersTypedFallback(mic.error) ? voice?.onMicLost : undefined,
    settle,
  };
}
