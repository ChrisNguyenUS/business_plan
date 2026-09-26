// One-row attempt envelopes for practice/flashcard answers (see recordAnswer and
// recordSectionAnswer in user-state.tsx). Civics oral spec §5 / §7 (rev 3.3);
// speaking spec §6.

import type { QuizMode } from './storage';

export type AnswerMode = 'choice' | 'voice' | 'typed';

export interface PracticeAttemptRow {
  user_id: string;
  mode: QuizMode;
  score: number;
  total_questions: 1;
  passed: null;
  completed_at: string;
  answer_mode?: AnswerMode;
}

/** `choice` omits answer_mode: the column defaults to 'choice', and MC practice
 *  must keep working even if migration n400_32 is not applied yet. */
export function practiceAttemptRow(
  userId: string,
  mode: QuizMode,
  wasCorrect: boolean,
  answerMode: AnswerMode,
  completedAt: string,
): PracticeAttemptRow {
  const row: PracticeAttemptRow = {
    user_id: userId,
    mode,
    score: wasCorrect ? 1 : 0,
    total_questions: 1,
    passed: null,
    completed_at: completedAt,
  };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}

/** One n400_section_attempts row (Speaking/Writing practice and flashcards). Like
 *  practiceAttemptRow, `choice` omits answer_mode: the column defaults to 'choice',
 *  so choice answers insert exactly as before n400_34 (speaking spec §6). */
export interface SectionAttemptRow {
  user_id: string;
  section: string;
  item_id: string;
  mode: string;
  was_correct: boolean;
  answer_mode?: AnswerMode;
}

export function sectionAttemptRow(
  userId: string,
  section: string,
  itemId: string,
  wasCorrect: boolean,
  mode: string,
  answerMode: AnswerMode = 'choice',
): SectionAttemptRow {
  const row: SectionAttemptRow = { user_id: userId, section, item_id: itemId, mode, was_correct: wasCorrect };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}

/** One n400_section_mock_results row (Speaking/Writing mock). Like the rows above,
 *  `choice` omits answer_mode: the column defaults to 'choice' (speaking spec §6). */
export interface SectionMockResultRow {
  user_id: string;
  section: 'writing' | 'speaking';
  passed: boolean;
  score: number;
  total: number;
  answer_mode?: AnswerMode;
}

export function sectionMockResultRow(
  userId: string,
  section: 'writing' | 'speaking',
  passed: boolean,
  score: number,
  total: number,
  answerMode: AnswerMode = 'choice',
): SectionMockResultRow {
  const row: SectionMockResultRow = { user_id: userId, section, passed, score, total };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}
