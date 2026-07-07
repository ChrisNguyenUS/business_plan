// Builds 4 multiple-choice options for a What Mean question from its authored
// distractors (whatmean-data.ts already carries 1 definition + 3 distractors).
// Positions are shuffled deterministically per (id, seed) so the correct answer
// is never fixed in place. Reuses the app's seeded shuffle for consistency.

import { shuffle } from './quiz-engine';
import type { WhatMeanQuestion } from './whatmean-data';

export interface WhatMeanOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

const OPTION_IDS: WhatMeanOption['id'][] = ['A', 'B', 'C', 'D'];

export function buildWhatMeanOptions(q: WhatMeanQuestion, seed: string | number): WhatMeanOption[] {
  const pool = [
    { text: q.definitionEn, isCorrect: true },
    ...q.distractorsEn.map((text) => ({ text, isCorrect: false })),
  ];
  const ordered = shuffle(pool, `${q.id}-mc-${seed}`);
  return ordered.map((o, i) => ({ id: OPTION_IDS[i], text: o.text, isCorrect: o.isCorrect }));
}
