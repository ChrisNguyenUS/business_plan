import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WRITING_SENTENCES } from './writing-data';

const PUB = resolve(process.cwd(), 'public');

describe('writing-data', () => {
  it('has 45 sentences with sequential namespaced ids', () => {
    expect(WRITING_SENTENCES).toHaveLength(45);
    WRITING_SENTENCES.forEach((s, i) => {
      expect(s.num).toBe(i + 1);
      expect(s.id).toBe(`wr-${i + 1}`);
    });
  });

  it('every record is bilingual with a topic', () => {
    for (const s of WRITING_SENTENCES) {
      expect(s.sentenceEn.length, s.id).toBeGreaterThan(0);
      expect(s.sentenceVi.length, s.id).toBeGreaterThan(0);
      expect(s.topicEn.length, s.id).toBeGreaterThan(0);
      expect(s.topicVi.length, s.id).toBeGreaterThan(0);
    }
  });

  it('every record has audio on disk', () => {
    for (const s of WRITING_SENTENCES) {
      expect(
        existsSync(resolve(PUB, `n400-audio/Writing_questions/${s.num}.mp3`)),
        `${s.id} audio`,
      ).toBe(true);
    }
  });
});
