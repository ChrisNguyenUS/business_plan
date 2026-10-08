import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Owner decision 2026-10-08 (B′): every Speaking and Writing mock — standalone and
// the Full interview's parts — also writes its items as graded mock_test rows, so a
// miss joins "Ôn câu sai" like a Civics mock miss. No DOM harness: pinned by source.
const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('mock items are recorded per item (B′)', () => {
  it('user-state writes one mock_test batch, without streak or badges (the result row owns those)', () => {
    const src = source('src/lib/n400/user-state.tsx');
    const start = src.indexOf('const recordSectionMockItems = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf('\n  );\n', start));
    expect(body).toContain("sectionAttemptRow(user.id, i.section, i.itemId, i.wasCorrect, 'mock_test', i.answerMode)");
    expect(body).toContain("mode: 'mock_test' as const");
    expect(body).not.toContain('nextStreak');
    expect(body).not.toContain('evaluateAfter');
    expect(src).toMatch(/\n {4}recordSectionMockItems,\n/);
  });

  it('Thi thử Viết records its sentences once the test is finished', () => {
    const page = source('src/app/n400ready/(app)/mock-test/viet/page.tsx');
    expect(page).toContain('void recordSectionMockItems(writingMockItems(perItem));');
  });

  it('Thi thử Speaking records its items in both the choice and the voice run', () => {
    const page = source('src/app/n400ready/(app)/mock-test/speaking/page.tsx');
    expect(page.match(/void recordSectionMockItems\(speakingMockItems\(/g)).toHaveLength(2);
  });

  it('Phỏng vấn đầy đủ records its Speaking and Writing parts', () => {
    const page = source('src/app/n400ready/(app)/mock-test/full/page.tsx');
    expect(page).toContain('void recordSectionMockItems(speakingMockItems(speakingAnswers.current));');
    expect(page).toContain('void recordSectionMockItems(writingMockItems(perItem));');
  });
});
