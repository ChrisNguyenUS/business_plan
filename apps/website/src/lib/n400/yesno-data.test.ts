import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { YESNO_QUESTIONS } from './yesno-data';

const PUB = resolve(process.cwd(), 'public');

describe('yesno-data', () => {
  it('has 37 questions with sequential namespaced ids', () => {
    expect(YESNO_QUESTIONS).toHaveLength(37);
    YESNO_QUESTIONS.forEach((q, i) => {
      expect(q.num).toBe(i + 1);
      expect(q.id).toBe(`yn-${i + 1}`);
    });
  });

  it('every record is bilingual with a standard answer', () => {
    for (const q of YESNO_QUESTIONS) {
      expect(q.questionEn.length, q.id).toBeGreaterThan(0);
      expect(q.questionVi.length, q.id).toBeGreaterThan(0);
      expect(['yes', 'no'], q.id).toContain(q.answer);
    }
  });

  it('every record has audio on disk', () => {
    for (const q of YESNO_QUESTIONS) {
      expect(
        existsSync(resolve(PUB, `n400-audio/Yes_no_question/sound/${q.num}.mp3`)),
        `${q.id} audio`,
      ).toBe(true);
    }
  });
});
