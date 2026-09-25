import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin where n400_oral_answer fires (spec §9) by source.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const practice = read('src/app/n400ready/(app)/practice/page.tsx');
const mock = read('src/app/n400ready/(app)/mock-test/civics/page.tsx');

describe('practice sends n400_oral_answer', () => {
  it('after grading, except a near, which waits for the learner', () => {
    expect(practice).toContain(
      "if (verdict !== 'near') trackOralAnswer(practiceAnswerEvent(question.id, panelInput, verdict, null, text));",
    );
  });

  it('after the learner answers the near prompt', () => {
    expect(practice).toContain("trackOralAnswer(practiceAnswerEvent(question.id, panelInput, 'near', yes, voiceText));");
  });

  it('once per mic error', () => {
    expect(practice).toMatch(
      /micErrorEvent\(question\.id, 'practice', panelInput, micError\)\);[\s\S]{0,120}\}, \[micError\]\);/,
    );
  });
});

describe('mock sends n400_oral_answer', () => {
  it('only from the server verdicts, after finalize resolves (Review Focus 4)', () => {
    const finalizeAt = mock.indexOf('await finalizeVoiceMockAttempt(');
    const eventsAt = mock.indexOf('mockAnswerEvents(slides.map((s) => s.questionId), finalItems, v.answers)');
    expect(finalizeAt).toBeGreaterThan(-1);
    expect(eventsAt).toBeGreaterThan(finalizeAt);
  });

  it('once per mic error during a voice run', () => {
    expect(mock).toMatch(
      /micErrorEvent\(qid, 'mock', mockItemInput\(voiceInput, micLost\), micError\)\);[\s\S]{0,120}\}, \[micError\]\);/,
    );
  });

  it('the mock start carries the answer mode it latches', () => {
    expect(mock).toContain('trackMockTestStart(run);');
    expect(mock).toContain('setRunMode(run);');
  });
});
