// Server-side grading of a voice mock (spec §6, rev 3.4). The client never sends
// a verdict: it sends transcripts (or, only for questions with no oral config,
// a multiple-choice pick) and this module decides was_correct. Input is
// untrusted, so every field is validated and nothing throws.

import type { QuizOption } from '../quiz-engine';
import { getOralAnswerConfig, type OralLocation } from './get-oral-config';
import { gradeOralAnswer } from './grade-oral';

export type SpokenMockAnswer = { qid: number; transcript: string; retried: boolean; input: 'mic' | 'typed' };
export type ChoiceMockAnswer = { qid: number; selected: QuizOption['id'] };
export type VoiceMockAnswer = SpokenMockAnswer | ChoiceMockAnswer;

export interface MockManifestItem {
  qid: number;
  correct: QuizOption['id'];
}

export interface GradedMockItem {
  qid: number;
  was_correct: boolean;
  transcript: string | null;
}

export const MAX_TRANSCRIPT = 500;

const OPTION_IDS: ReadonlySet<string> = new Set(['A', 'B', 'C', 'D']);

function firstAnswers(answers: unknown): Map<number, Record<string, unknown>> {
  const byQid = new Map<number, Record<string, unknown>>();
  if (!Array.isArray(answers)) return byQid;
  for (const a of answers) {
    if (typeof a !== 'object' || a === null) continue;
    const rec = a as Record<string, unknown>;
    if (typeof rec.qid !== 'number' || !Number.isInteger(rec.qid)) continue;
    if (!byQid.has(rec.qid)) byQid.set(rec.qid, rec);
  }
  return byQid;
}

export function gradeVoiceMock(
  answers: unknown,
  manifest: readonly MockManifestItem[],
  location: OralLocation,
): { results: GradedMockItem[]; answerMode: 'voice' | 'typed' } {
  const byQid = firstAnswers(answers);
  let anyMic = false;

  const results = manifest.map(({ qid, correct }): GradedMockItem => {
    const a = byQid.get(qid);
    const config = getOralAnswerConfig(qid, location);
    if (config === null) {
      const selected = a?.selected;
      const ok = typeof selected === 'string' && OPTION_IDS.has(selected) && selected === correct;
      return { qid, was_correct: ok, transcript: null };
    }
    if (typeof a?.transcript !== 'string') return { qid, was_correct: false, transcript: null };
    const transcript = a.transcript.trim().slice(0, MAX_TRANSCRIPT);
    if (a.input === 'mic') anyMic = true;
    return { qid, was_correct: gradeOralAnswer(transcript, config).verdict === 'correct', transcript };
  });

  return { results, answerMode: anyMic ? 'voice' : 'typed' };
}
