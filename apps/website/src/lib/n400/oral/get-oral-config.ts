// Resolves the OralAnswerConfig for one question: generated config + aliases,
// or — for location-based questions — the learner's personal answers.

import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import type { StateCode } from '../state-data';
import { surnameOf } from './build-config';
import { keywordsOf } from './normalize';
import { ORAL_ALIASES } from './oral-aliases';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';
import type { OralAnswerConfig } from './types';

export interface OralLocation {
  stateCode: StateCode;
  districtNumber: number | null;
}

const PERSON_LOCATION_IDS: ReadonlySet<number> = new Set([23, 29, 61]);

export function getOralAnswerConfig(qid: number, location?: OralLocation): OralAnswerConfig | null {
  const q = N400_QUESTIONS_BY_ID.get(qid);
  if (!q) return null;

  if (q.isLocationBased) {
    if (!location) return null;
    const answers = correctAnswersFor(q, location.stateCode, location.districtNumber);
    if (answers.length === 0) return null;
    const alternatives = answers
      .map((a) => (PERSON_LOCATION_IDS.has(qid) ? surnameOf(a.en) : keywordsOf(a.en).join(' ')))
      .filter(Boolean)
      .map((k) => [k]);
    return alternatives.length > 0 ? { type: 'single', alternatives } : null;
  }

  const generated = ORAL_ANSWER_CONFIG[qid];
  if (!generated) return null;
  const aliases = ORAL_ALIASES[qid];
  return aliases ? { ...generated, alternatives: [...generated.alternatives, ...aliases] } : generated;
}
