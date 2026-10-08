import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.4. No DOM harness in this app: wiring is pinned by source.
const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = source('src/app/n400ready/(app)/mock-test/full/page.tsx');
const result = source('src/app/n400ready/(app)/mock-test/full/MockTestResult.tsx');

describe('Full interview Civics part is graded by the server (spec §2.4)', () => {
  it('registers the attempt with the seed the quiz builds from', () => {
    expect(page).toContain("const args = { kind: 'full' as const, seed: `full-${next}`, stateCode, districtNumber };");
    expect(page).toContain('buildCivicsPhase(`full-${seed}`, stateCode, districtNumber, dict)');
  });

  it('finalizes as the full kind, by voice or by picks', () => {
    expect(page).toContain('fullCivicsSubmission(runMode, civicsInputs.current)');
    expect(page).toContain("finalizeVoiceMockAttempt(id, submission.answers, 'full')");
    expect(page).toContain("finalizeMockAttempt(id, submission.picks, 'full')");
  });

  it('retries a failed background start once inside the save (Review Focus 1)', () => {
    expect(page).toContain('(await startMockAttempt(pendingStart.current)).attemptId');
  });

  it('ignores a save that settles after a newer run started (Review Focus 2)', () => {
    expect(page).toContain('if (runToken.current !== run) return;');
  });

  it('opening the summary gives a failed save its one retry, and the note shows when unsaved', () => {
    expect(page).toContain('civicsSave.current?.retryIfFailed();');
    expect(page).toContain("civicsUnsaved={civicsSaveStatus === 'unsaved'}");
  });

  it('records the server result locally, never with a browser insert', () => {
    expect(page).toContain('noteMockResult(');
    expect(page).not.toContain('recordMockResult(');
  });

  it('the result screen shows the note under Civics only', () => {
    expect(result).toContain("key === 'civics' && civicsUnsaved");
    expect(result).toContain('dict.mockTest.summary.civicsUnsaved');
  });

  it('copy is the owner-approved wording', () => {
    expect(source('src/lib/n400/i18n/vi.ts')).toContain(
      "civicsUnsaved: 'Chưa lưu được kết quả phần Civics, nên kết quả này sẽ không có trong lịch sử.',",
    );
    expect(source('src/lib/n400/i18n/en.ts')).toContain(
      `civicsUnsaved: "Your Civics result couldn't be saved, so it won't appear in your history.",`,
    );
  });
});
