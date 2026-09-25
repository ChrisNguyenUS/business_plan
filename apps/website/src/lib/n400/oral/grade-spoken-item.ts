// One grader for every spoken interview item (speaking spec §3.3, S3): Civics,
// What-mean and Yes/No. Pure: the same code grades practice, the Speaking mock
// and the Full interview on the client. The standalone Civics voice mock keeps
// its server finalize.

import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import { WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { YESNO_QUESTIONS_BY_ID } from '../yesno-data';
import { getOralAnswerConfig, type OralLocation } from './get-oral-config';
import { getWhatMeanOralConfig, gradeWhatMean } from './get-whatmean-config';
import { gradeOralAnswer } from './grade-oral';
import { nearPromptAnswer } from './voice-outcome';
import { gradeYesNo } from './yes-no-intent';

export type SpokenItem =
  | { kind: 'civics'; qid: number }
  | { kind: 'whatmean'; id: string }
  | { kind: 'yesno'; id: string };

export interface SpokenGrade {
  verdict: 'correct' | 'near' | 'wrong' | 'unclear';
  /** The answer to offer in "Có phải bạn nói …?"; only set for `near`. */
  nearAnswer: string | null;
}

const WRONG: SpokenGrade = { verdict: 'wrong', nearAnswer: null };

/** "civ-12" | "wm-3" | "yn-7" → the item, or null when the id is unknown. */
export function spokenItemFromId(itemId: string): SpokenItem | null {
  const civics = /^civ-(\d+)$/.exec(itemId);
  if (civics) {
    const qid = Number(civics[1]);
    return N400_QUESTIONS_BY_ID.has(qid) ? { kind: 'civics', qid } : null;
  }
  if (WHATMEAN_QUESTIONS_BY_ID[itemId]) return { kind: 'whatmean', id: itemId };
  if (YESNO_QUESTIONS_BY_ID[itemId]) return { kind: 'yesno', id: itemId };
  return null;
}

/** False when the item has nothing to grade a spoken answer against (it stays multiple choice). */
export function canSpeak(item: SpokenItem, location: OralLocation): boolean {
  if (item.kind === 'civics') return getOralAnswerConfig(item.qid, location) !== null;
  if (item.kind === 'whatmean') return getWhatMeanOralConfig(item.id) !== null;
  return Boolean(YESNO_QUESTIONS_BY_ID[item.id]);
}

export function gradeSpokenItem(item: SpokenItem, transcript: string, location: OralLocation): SpokenGrade {
  if (item.kind === 'yesno') {
    const q = YESNO_QUESTIONS_BY_ID[item.id];
    return q ? { verdict: gradeYesNo(transcript, q.answer), nearAnswer: null } : WRONG;
  }

  if (item.kind === 'whatmean') {
    const q = WHATMEAN_QUESTIONS_BY_ID[item.id];
    const grade = q ? gradeWhatMean(transcript, item.id) : null;
    if (!q || !grade) return WRONG;
    return { verdict: grade.verdict, nearAnswer: grade.verdict === 'near' ? q.definitionEn : null };
  }

  const q = N400_QUESTIONS_BY_ID.get(item.qid);
  const config = getOralAnswerConfig(item.qid, location);
  if (!q || !config) return WRONG;
  const verdict = gradeOralAnswer(transcript, config).verdict;
  if (verdict !== 'near') return { verdict, nearAnswer: null };
  const answers = correctAnswersFor(q, location.stateCode, location.districtNumber).map((a) => a.en);
  const nearAnswer = nearPromptAnswer(transcript, config, answers);
  // A near with nothing to offer cannot be confirmed, so it counts as wrong (as in Civics practice).
  return nearAnswer === null ? WRONG : { verdict: 'near', nearAnswer };
}
