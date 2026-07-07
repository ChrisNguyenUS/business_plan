import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WHATMEAN_QUESTIONS } from './whatmean-data';

// vitest runs with cwd = apps/website
const PUB = resolve(process.cwd(), 'public');

describe('whatmean-data', () => {
  it('has 62 questions with sequential namespaced ids', () => {
    expect(WHATMEAN_QUESTIONS).toHaveLength(62);
    WHATMEAN_QUESTIONS.forEach((q, i) => {
      expect(q.num).toBe(i + 1);
      expect(q.id).toBe(`wm-${i + 1}`);
    });
  });

  it('every record is fully bilingual', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(q.termEn.length, q.id).toBeGreaterThan(0);
      expect(q.termVi.length, q.id).toBeGreaterThan(0);
      expect(q.questionEn.length, q.id).toBeGreaterThan(0);
      expect(q.questionVi.length, q.id).toBeGreaterThan(0);
      expect(q.definitionEn.length, q.id).toBeGreaterThan(0);
      expect(q.definitionVi.length, q.id).toBeGreaterThan(0);
    }
  });

  it('every record has exactly 3 distractors, none equal to the correct definition', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(q.distractorsEn, q.id).toHaveLength(3);
      const all = new Set([q.definitionEn, ...q.distractorsEn]);
      expect(all.size, `${q.id} has duplicate options`).toBe(4);
    }
  });

  it('every record has question and answer audio on disk', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(
        existsSync(resolve(PUB, `n400-audio/What_mean_questions/question/${q.num}.mp3`)),
        `${q.id} question audio`,
      ).toBe(true);
      expect(
        existsSync(resolve(PUB, `n400-audio/What_mean_questions/answer/${q.num}.mp3`)),
        `${q.id} answer audio`,
      ).toBe(true);
    }
  });
});
