// Per-item state rules for the voice mock (spec §6, §8, rev 3.4). Pure, so the
// mock page stays thin and these rules stay tested.

import type { QuizOption } from '../quiz-engine';
import type { VoiceMockAnswer } from './grade-voice-mock';
import type { MicError } from './speech-controller';
import type { VoiceInput } from './voice-support';

export interface VoiceItem {
  transcript: string;
  retried: boolean;
  input: 'mic' | 'typed';
  confirmed: boolean;
}

/** Mic unusable for the rest of the test; reloading would lose the attempt. */
export function micLostFrom(error: MicError | null, supported: boolean): boolean {
  return !supported || error === 'not-allowed' || error === 'unavailable' || error === 'stalled';
}

export function mockItemInput(voiceInput: VoiceInput, micLost: boolean): 'mic' | 'typed' {
  return voiceInput === 'mic' && !micLost ? 'mic' : 'typed';
}

export function canAdvance(isVoiceItem: boolean, item: VoiceItem | null, picked: QuizOption['id'] | null): boolean {
  return isVoiceItem ? item?.confirmed === true : picked !== null;
}

export function toVoiceMockAnswers(
  qids: readonly number[],
  items: readonly (VoiceItem | null)[],
  picks: readonly (QuizOption['id'] | null)[],
): VoiceMockAnswer[] {
  const out: VoiceMockAnswer[] = [];
  qids.forEach((qid, i) => {
    const it = items[i];
    const picked = picks[i];
    if (it?.confirmed) out.push({ qid, transcript: it.transcript, retried: it.retried, input: it.input });
    else if (picked) out.push({ qid, selected: picked });
  });
  return out;
}
