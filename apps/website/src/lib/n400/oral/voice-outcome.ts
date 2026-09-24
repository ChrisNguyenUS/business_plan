// Maps an oral verdict (+ the learner's answer to "Có phải bạn nói …?") to what
// practice shows and records. Spec §5; D7 keeps "thuộc = graded only".

import { gradeOralAnswer } from './grade-oral';
import type { OralAnswerConfig, OralVerdict } from './types';

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

/** The answer to offer in "Có phải bạn nói …?": the one whose own alternative the
 *  transcript came closest to (e.g. Schiff, not Padilla). Config alternatives
 *  are built one per answer, in order (aliases come after). null = nothing to offer. */
export function nearPromptAnswer(
  transcript: string,
  config: OralAnswerConfig,
  answers: readonly string[],
): string | null {
  if (answers.length === 1) return answers[0];
  if (config.alternatives.length < answers.length) return null;
  let best = -1;
  let bestRank = 0;
  let bestHits = -1;
  answers.forEach((_, i) => {
    const g = gradeOralAnswer(transcript, { ...config, alternatives: [config.alternatives[i]] });
    const rank = g.verdict === 'correct' ? 2 : g.verdict === 'near' ? 1 : 0;
    if (rank > bestRank || (rank === bestRank && rank > 0 && g.matched.length > bestHits)) {
      best = i;
      bestRank = rank;
      bestHits = g.matched.length;
    }
  });
  return best >= 0 ? answers[best] : null;
}
