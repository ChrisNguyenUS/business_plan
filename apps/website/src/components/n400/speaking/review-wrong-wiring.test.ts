import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin by source that "Ôn câu sai" replays only this session's
// wrong items (like Civics practice), in a fresh session.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('Ôn câu sai — What-mean / Yes-No', () => {
  const mc = read('src/components/n400/speaking/SectionMCQuiz.tsx');
  const yn = read('src/components/n400/speaking/SectionYesNoQuiz.tsx');
  const wm = read('src/app/n400ready/(app)/speaking/what-mean/page.tsx');
  const ynPage = read('src/app/n400ready/(app)/speaking/yes-no/page.tsx');

  it('the quizzes remember which items were wrong and hand them to the page', () => {
    for (const quiz of [mc, yn]) {
      expect(quiz).toContain('const [wrongIds, setWrongIds] = useState<string[]>([]);');
      expect(quiz).toContain('onReviewWrong={onReviewWrong ? () => onReviewWrong(wrongIds) : onRestart}');
    }
    expect(mc.match(/setWrongIds\(\(w\) => \[\.\.\.w, q\.itemId\]\)/g)).toHaveLength(2);
    expect(yn.match(/setWrongIds\(\(w\) => \[\.\.\.w, q\.id\]\)/g)).toHaveLength(2);
  });

  it('the pages start a fresh session with only those items', () => {
    expect(wm).toContain('onReviewWrong={(ids) => startPracticeIds(ids)}');
    expect(ynPage).toContain('onReviewWrong={(ids) => startQuizIds(ids)}');
  });
});

describe('Ôn câu sai / Làm lại — Viết', () => {
  const quiz = read('src/components/n400/speaking/DictationQuiz.tsx');
  const page = read('src/app/n400ready/(app)/writing/page.tsx');

  it('the summary buttons end the session with what comes next, so the finished run is recorded', () => {
    expect(quiz).toContain("onReviewWrong={() => onSessionEnd(sessionResults(), 'review-wrong')}");
    expect(quiz).toContain("onRetry={() => onSessionEnd(sessionResults(), 'retry')}");
  });

  it('the page records the run, then opens a fresh session (wrong sentences only, or a new set)', () => {
    expect(page).toContain("if (next === 'review-wrong') startQuizSentences(wrong);");
    expect(page).toContain("else if (next === 'retry') startQuizWith(questions.length, mode.minutes);");
    expect(page).toMatch(/<DictationQuiz\s+key=\{mode\.seed\}/);
  });
});
