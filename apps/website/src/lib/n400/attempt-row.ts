// One-row quiz-attempt envelope for practice/flashcard answers (see
// recordAnswer in user-state.tsx). Spec §5 / §7 (oral answers rev 3.3).

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
