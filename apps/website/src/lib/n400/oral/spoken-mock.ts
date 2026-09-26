// What Thi thử Speaking does with a spoken answer (speaking spec §5.1, §10). Pure:
// the mock page holds one SpokenMockAnswer per item and calls these.

import type { OralLocation } from './get-oral-config';
import { gradeSpokenItem, type SpokenGrade, type SpokenItem } from './grade-spoken-item';

/** One mock item's answer. Nothing is graded until the finish (no verdict mid-test). */
export interface SpokenMockAnswer {
  /** The confirmed words ("Bạn nói: …" on the result screen). */
  transcript: string;
  /** [Nói lại] was used: it is allowed once per item. */
  retried: boolean;
  input: 'mic' | 'typed';
  /** [Đúng vậy] / [Xác nhận] locked it: the learner can move on. */
  confirmed: boolean;
  /** Yes/No neither yes nor no: asked again; the item stays open and the retry is kept. */
  reask: boolean;
}

/** After [Đúng vậy] / [Xác nhận]. A Yes/No answer that is neither yes nor no is
 *  asked again instead: nothing locks and [Nói lại] stays as it was (spec §10).
 *  A confirmed answer never changes. */
export function mockConfirm(
  prev: SpokenMockAnswer | null,
  text: string,
  input: 'mic' | 'typed',
  verdict: SpokenGrade['verdict'],
): SpokenMockAnswer {
  if (prev?.confirmed) return prev;
  const retried = prev?.retried ?? false;
  if (verdict === 'unclear') return { transcript: '', retried, input, confirmed: false, reask: true };
  return { transcript: text, retried, input, confirmed: true, reask: false };
}

/** After [Nói lại]: the item's one retry. A mic error or a re-ask never uses it. */
export function mockRetry(input: 'mic' | 'typed'): SpokenMockAnswer {
  return { transcript: '', retried: true, input, confirmed: false, reask: false };
}

/** Grading at the finish: gradeSpokenItem per item, `near` counts as wrong (D8). The
 *  run is 'voice' when any answer came from the mic, else 'typed' (the Civics voice
 *  mock rule). */
export function gradeSpokenMock(
  items: readonly (SpokenItem | null)[],
  answers: readonly (SpokenMockAnswer | null)[],
  location: OralLocation,
): { ok: boolean[]; score: number; answerMode: 'voice' | 'typed' } {
  const ok = items.map((item, i) => {
    const a = answers[i];
    return item !== null && a?.confirmed === true && gradeSpokenItem(item, a.transcript, location).verdict === 'correct';
  });
  const anyMic = answers.some((a) => a?.confirmed === true && a.input === 'mic');
  return { ok, score: ok.filter(Boolean).length, answerMode: anyMic ? 'voice' : 'typed' };
}
