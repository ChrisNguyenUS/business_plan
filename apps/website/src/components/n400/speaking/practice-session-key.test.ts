import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin by source that every practice session remounts its quiz
// (speaking spec S8, rev 1.1). Without the key, Làm lại / Ôn câu sai kept the old
// index, so the old summary showed again.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const whatMean = read('src/app/n400ready/(app)/speaking/what-mean/page.tsx');
const yesNo = read('src/app/n400ready/(app)/speaking/yes-no/page.tsx');

describe('Speaking practice: one quiz instance per session (Review Focus 4)', () => {
  it('What-mean keys its quiz by the session seed', () => {
    expect(whatMean).toMatch(/<SectionMCQuiz\s+key=\{mode\.seed\}/);
  });

  it('Yes/No quiz sessions carry a seed and key the quiz by it', () => {
    expect(yesNo).toContain("| { kind: 'quiz'; ids: string[]; seed: string; minutes?: number | null };");
    expect(yesNo).toMatch(/<SectionYesNoQuiz\s+key=\{mode\.seed\}/);
  });
});
