// One-row attempt envelopes for practice/flashcard answers (see recordAnswer and
// recordSectionAnswer in user-state.tsx). Civics oral spec §5 / §7 (rev 3.3);
// speaking spec §6.

import type { QuizMode } from './storage';
import { MAX_TRANSCRIPT } from './oral/grade-voice-mock';

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

/** How a run or part was answered (speaking spec §5.2): 'voice' when any answer came
 *  from the mic, else 'typed' when any was typed, else 'choice' (the Civics voice
 *  mock rule, plus 'choice' when nothing was spoken). */
export function answerModeOf(inputs: readonly ('mic' | 'typed' | undefined)[]): AnswerMode {
  if (inputs.includes('mic')) return 'voice';
  return inputs.includes('typed') ? 'typed' : 'choice';
}

/** The n400_quiz_attempts row of a client-recorded Civics mock (the Full interview's
 *  Civics part). `choice` omits answer_mode: the column defaults to 'choice'. */
export interface MockQuizAttemptRow {
  user_id: string;
  mode: 'mock_test';
  score: number;
  total_questions: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  answer_mode?: AnswerMode;
}

export function mockQuizAttemptRow(
  userId: string,
  r: { score: number; total: number; passed: boolean; startedAt: string; completedAt: string },
  answerMode: AnswerMode = 'choice',
): MockQuizAttemptRow {
  const row: MockQuizAttemptRow = {
    user_id: userId,
    mode: 'mock_test',
    score: r.score,
    total_questions: r.total,
    passed: r.passed,
    started_at: r.startedAt,
    completed_at: r.completedAt,
  };
  return answerMode === 'choice' ? row : { ...row, answer_mode: answerMode };
}

/** Its n400_question_attempts rows. A spoken answer keeps its words, trimmed and at
 *  most MAX_TRANSCRIPT characters (like the Civics voice mock); a picked answer has none. */
export interface MockQuestionAttemptRow {
  attempt_id: string;
  question_id: number;
  was_correct: boolean;
  transcript?: string;
}

export function mockQuestionAttemptRows(
  attemptId: string,
  results: readonly { questionId: number; wasCorrect: boolean; transcript?: string }[],
): MockQuestionAttemptRow[] {
  return results.map((r) => {
    const row: MockQuestionAttemptRow = { attempt_id: attemptId, question_id: r.questionId, was_correct: r.wasCorrect };
    return r.transcript === undefined ? row : { ...row, transcript: r.transcript.trim().slice(0, MAX_TRANSCRIPT) };
  });
}
