// Oral-answer grading types. Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §3.

export type OralAnswerType = 'single' | 'phrase' | 'enumeration';

export interface OralAnswerConfig {
  type: OralAnswerType;
  /** Any-of alternatives; each inner array is the parts of one answer, ALL required. A part is space-separated keywords. */
  alternatives: string[][];
  /** phrase only: keywords required. */
  minKeywords?: number;
  /** Keywords that must match exactly regardless of minKeywords (negation, numbers). */
  mustInclude?: string[];
  /** Any of these in the transcript blocks `correct` (the verdict falls to at best `near`). */
  mustExclude?: string[];
  /** Word sequences, stopwords included, that count as a full answer ("not have to").
   *  For definitions made of stopwords (speaking Gate S1, What-mean #52). */
  phrases?: string[];
}

export type OralVerdict = 'correct' | 'near' | 'wrong';

export interface OralGrade {
  verdict: OralVerdict;
  matched: string[];
  missing: string[];
}
