import { N400_CATEGORY_LABELS, N400_QUESTIONS, N400_QUESTIONS_BY_ID } from './questions-data';
import { type N400Distractor } from './distractors-data';
import { answerAudioUrl, questionAudioUrl, staticDistractorsFor } from './quiz-engine';

// Read-only view for the admin "Câu hỏi" pages. questions-data.ts is the
// single source of truth (owner 2026-10-16); the n400_questions/n400_answers
// tables are only an id registry for FKs. Audio = the public files learners hear.

export interface AdminQuestionRow {
  id: number;
  questionEn: string;
  category: string;
  isLocationBased: boolean;
}

export interface AdminQuestionDetail extends AdminQuestionRow {
  questionVi: string;
  answers: N400Distractor[];
  distractors: N400Distractor[];
  questionAudio: string;
  answerAudio: string | null;
}

export function adminQuestionRows(): AdminQuestionRow[] {
  return N400_QUESTIONS.map((q) => ({
    id: q.id,
    questionEn: q.questionEn,
    category: N400_CATEGORY_LABELS[q.category].en,
    isLocationBased: q.isLocationBased,
  }));
}

export function adminQuestionDetail(id: number): AdminQuestionDetail | null {
  const q = N400_QUESTIONS_BY_ID.get(id);
  if (!q) return null;
  return {
    id: q.id,
    questionEn: q.questionEn,
    questionVi: q.questionVi,
    category: N400_CATEGORY_LABELS[q.category].en,
    isLocationBased: q.isLocationBased,
    answers: q.answersEn.map((en, i) => ({ en, vi: q.answersVi[i] })),
    // Same filter as the quiz: an accepted answer is never shown as a wrong choice.
    distractors: staticDistractorsFor(q.id, q.answersEn),
    questionAudio: questionAudioUrl(q.id),
    // Location-based answers vary by state; those have no civic_answer file.
    answerAudio: q.isLocationBased ? null : answerAudioUrl(q.id),
  };
}
