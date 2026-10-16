import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminQuestionDetail, adminQuestionRows } from './admin-question-view';
import { N400_QUESTIONS } from './questions-data';
import { N400_DISTRACTORS } from './distractors-data';

// The admin "Câu hỏi" pages are a read-only window onto what learners see:
// text from questions-data.ts / distractors-data.ts, audio from public/n400-audio.
const publicFile = (url: string) => join(process.cwd(), 'public', url);

describe('adminQuestionRows', () => {
  it('lists the 128 learner questions in order with their category label', () => {
    const rows = adminQuestionRows();
    expect(rows.map((r) => r.id)).toEqual(N400_QUESTIONS.map((q) => q.id));
    expect(rows[101]).toMatchObject({
      id: 102,
      questionEn: 'When did all women get the right to vote?',
      category: 'American History',
      isLocationBased: false,
    });
  });
});

describe('adminQuestionDetail', () => {
  it('returns null for an id outside the bank', () => {
    expect(adminQuestionDetail(0)).toBeNull();
    expect(adminQuestionDetail(129)).toBeNull();
  });

  it('shows the learner text: correct answers and wrong choices', () => {
    const d = adminQuestionDetail(38)!;
    expect(d.questionEn).toBe('What is the name of the President of the United States now?');
    expect(d.answers).toEqual([{ en: 'Donald Trump', vi: 'Donald Trump' }]);
    expect(d.distractors).toEqual(N400_DISTRACTORS[38]);
  });

  it('points at the audio files learners hear, and every one exists', () => {
    for (const q of N400_QUESTIONS) {
      const d = adminQuestionDetail(q.id)!;
      expect(d.questionAudio).toBe(`/n400-audio/civic_question/q${String(q.id).padStart(3, '0')}.mp3`);
      expect(existsSync(publicFile(d.questionAudio))).toBe(true);
      if (d.answerAudio) expect(existsSync(publicFile(d.answerAudio))).toBe(true);
    }
  });

  it('has no answer audio only for the location-based questions', () => {
    const missing = N400_QUESTIONS.filter((q) => !adminQuestionDetail(q.id)!.answerAudio).map((q) => q.id);
    expect(missing).toEqual([23, 29, 61, 62]);
  });
});
