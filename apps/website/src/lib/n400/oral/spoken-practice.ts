// What Speaking practice does with a spoken answer (speaking spec §4, rev 1.1).
// Pure: the hook use-spoken-practice.ts holds one SpokenAnswer and calls these.

import type { OralSection } from '@/lib/n400/analytics';
import type { SpokenGrade, SpokenItem } from './grade-spoken-item';
import type { OralVerdict } from './types';
import type { VoiceInput } from './voice-support';

/** One item's spoken answer, tagged with its item: a new item starts clean by
 *  itself (answerFor), so nothing is reset when the learner moves on. */
export interface SpokenAnswer {
  itemId: string | null;
  /** What the learner said or typed last ("Bạn nói: …"). */
  text: string;
  /** null until graded. A Yes/No `unclear` is never a verdict: see `reask`. */
  verdict: OralVerdict | null;
  /** The taught answer offered in "Có phải bạn nói …?" (near only). */
  nearPrompt: string | null;
  nearAnswer: 'yes' | 'no' | null;
  /** Yes/No unclear: asked again; the item stays open. */
  reask: boolean;
}

export function freshAnswer(itemId: string | null): SpokenAnswer {
  return { itemId, text: '', verdict: null, nearPrompt: null, nearAnswer: null, reask: false };
}

/** The stored answer when it is this item's; otherwise a fresh one. */
export function answerFor(stored: SpokenAnswer, itemId: string | null): SpokenAnswer {
  return stored.itemId === itemId ? stored : freshAnswer(itemId);
}

/** Graded, or a near waiting for its answer: no more speaking or typing. */
export function isLocked(answer: SpokenAnswer): boolean {
  return answer.verdict !== null;
}

/** After the learner speaks or types. A graded item never changes. */
export function afterAttempt(answer: SpokenAnswer, text: string, grade: SpokenGrade): SpokenAnswer {
  if (isLocked(answer)) return answer;
  if (grade.verdict === 'unclear') return { ...answer, text, reask: true };
  return { ...answer, text, verdict: grade.verdict, nearPrompt: grade.nearAnswer, reask: false };
}

/** After [Đúng vậy] / [Không]. Only a near that is still waiting changes. */
export function afterNearAnswer(answer: SpokenAnswer, yes: boolean): SpokenAnswer {
  if (answer.verdict !== 'near' || answer.nearAnswer !== null) return answer;
  return { ...answer, nearAnswer: yes ? 'yes' : 'no' };
}

export interface SpokenStep {
  /** The item is answered: reveal the feedback and count it. */
  settle: boolean;
  shownCorrect: boolean;
  /** What to record; null = nothing (a confirmed near, D7, or not settled). */
  record: boolean | null;
}

export function spokenPracticeStep(answer: SpokenAnswer): SpokenStep {
  const { verdict, nearAnswer } = answer;
  if (verdict === 'correct') return { settle: true, shownCorrect: true, record: true };
  if (verdict === 'wrong') return { settle: true, shownCorrect: false, record: false };
  // D7: shown correct, no attempt row. The hook still sends its analytics event.
  if (verdict === 'near' && nearAnswer === 'yes') return { settle: true, shownCorrect: true, record: null };
  if (verdict === 'near' && nearAnswer === 'no') return { settle: true, shownCorrect: false, record: false };
  // Not graded yet, re-asked, or a near waiting for its answer.
  return { settle: false, shownCorrect: false, record: null };
}

/** How the panel takes the answer, and how it is recorded (answer_mode). In-app
 *  browsers type (D12); a lost mic types for the rest of the session. */
export function spokenInput(
  voiceInput: VoiceInput,
  micLost: boolean,
): { panelInput: 'mic' | 'typed'; via: 'voice' | 'typed' } {
  return voiceInput === 'typed' || micLost ? { panelInput: 'typed', via: 'typed' } : { panelInput: 'mic', via: 'voice' };
}

/** Numeric id for analytics: the civics qid, or the n of "wm-n" / "yn-n". */
export function spokenQid(item: SpokenItem): number {
  if (item.kind === 'civics') return item.qid;
  return Number(item.id.slice(item.id.indexOf('-') + 1));
}

export function spokenSection(item: SpokenItem): OralSection {
  return item.kind;
}
