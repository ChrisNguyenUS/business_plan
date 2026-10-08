// One builder for every Civics mock's questions and answer key (RLS hardening
// spec §2.1). The client renders the slides and startMockAttempt stores the key,
// so both sides always agree on what the learner was dealt.

import { buildOptions, selectMockTestQuestions, type QuizOption } from './quiz-engine';
import type { N400Question } from './questions-data';
import type { StateCode } from './state-data';

/** 'civics' = Thi thử Civics; 'full' = the Civics part of Phỏng vấn đầy đủ. */
export type CivicsMockKind = 'civics' | 'full';

export interface CivicsMockSlide {
  question: N400Question;
  options: QuizOption[];
}

export interface CivicsMockKeyItem {
  qid: number;
  correct: QuizOption['id'];
}

/** The option seeds are the ones each mock used before this module existed, so a
 *  seed deals exactly the questions and options it always did. 'civics' skips Q29
 *  (your Representative) when the district is unknown; 'full' keeps it and then
 *  accepts any Representative of the state. */
export function civicsMockSlides(
  kind: CivicsMockKind,
  seed: string,
  stateCode: StateCode,
  districtNumber: number | null,
): CivicsMockSlide[] {
  const questions = selectMockTestQuestions(seed);
  if (kind === 'full') {
    return questions.map((question, i) => ({
      question,
      options: buildOptions(question, stateCode, `full-${seed}-${i}`, districtNumber),
    }));
  }
  return questions
    .filter((q) => q.id !== 29 || districtNumber !== null)
    .map((question) => ({
      question,
      options: buildOptions(question, stateCode, `mock-${seed}-${question.id}`, districtNumber),
    }));
}

export function civicsMockAnswerKey(slides: readonly CivicsMockSlide[]): CivicsMockKeyItem[] {
  return slides.map(({ question, options }) => {
    const correct = options.find((o) => o.isCorrect);
    // buildOptions always shuffles the correct answer in; guard anyway.
    if (!correct) throw new Error(`quiz-engine: no correct option built for q${question.id}`);
    return { qid: question.id, correct: correct.id };
  });
}
