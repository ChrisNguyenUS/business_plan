// Maps an oral verdict (+ the learner's answer to "Có phải bạn nói …?") to what
// practice shows and records. Spec §5; D7 keeps "thuộc = graded only".

import type { OralVerdict } from './types';

export interface VoiceOutcome {
  shownCorrect: boolean;
  /** Value for recordAnswer's wasCorrect; null = do not record. */
  record: boolean | null;
}

export function voiceOutcome(verdict: OralVerdict, nearAnswer: 'yes' | 'no' | null): VoiceOutcome | null {
  if (verdict === 'correct') return { shownCorrect: true, record: true };
  if (verdict === 'wrong') return { shownCorrect: false, record: false };
  if (nearAnswer === 'yes') return { shownCorrect: true, record: null };
  if (nearAnswer === 'no') return { shownCorrect: false, record: false };
  return null;
}
