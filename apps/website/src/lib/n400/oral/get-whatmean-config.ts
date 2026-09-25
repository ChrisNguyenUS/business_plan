// Resolves What-mean grading: the generated config plus the owner-reviewed
// synonyms. Synonyms are graded as their own `single` config (every keyword
// required, inheriting mustExclude) because a `phrase` config's minKeywords
// would make a shorter synonym unreachable; the better verdict wins.
// Speaking spec §3.1 (S1 ruling 2).

import { gradeOralAnswer } from './grade-oral';
import type { OralAnswerConfig, OralGrade } from './types';
import { WHATMEAN_ORAL_ALIASES } from './whatmean-oral-aliases';
import { WHATMEAN_ORAL_CONFIG } from './whatmean-oral-config.generated';

export interface WhatMeanOralConfig {
  primary: OralAnswerConfig;
  /** Synonyms: every keyword required; inherits the primary's mustExclude. */
  aliases: OralAnswerConfig | null;
}

export function getWhatMeanOralConfig(id: string): WhatMeanOralConfig | null {
  const primary = WHATMEAN_ORAL_CONFIG[id];
  if (!primary) return null;
  const alts = WHATMEAN_ORAL_ALIASES[id];
  const aliases: OralAnswerConfig | null = alts
    ? { type: 'single', alternatives: alts, ...(primary.mustExclude ? { mustExclude: primary.mustExclude } : {}) }
    : null;
  return { primary, aliases };
}

const RANK = { wrong: 0, near: 1, correct: 2 } as const;

export function gradeWhatMean(transcript: string, id: string): OralGrade | null {
  const config = getWhatMeanOralConfig(id);
  if (!config) return null;
  const primary = gradeOralAnswer(transcript, config.primary);
  if (!config.aliases) return primary;
  const alias = gradeOralAnswer(transcript, config.aliases);
  return RANK[alias.verdict] > RANK[primary.verdict] ? alias : primary;
}
