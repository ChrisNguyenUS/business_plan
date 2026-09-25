import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the mock page's security-relevant wiring by source.
const page = readFileSync(join(process.cwd(), 'src/app/n400ready/(app)/mock-test/civics/page.tsx'), 'utf8');

describe('voice mock page wiring (spec §6 invariant)', () => {
  it('finalizes voice runs through the server action', () => {
    expect(page).toContain('finalizeVoiceMockAttempt(');
  });

  it('never grades or sends a verdict on the client', () => {
    expect(page).not.toContain('gradeOralAnswer');
    expect(page).not.toContain('was_correct');
    expect(page).not.toContain('wasCorrect:');
  });

  it('remounts the answer panel per question', () => {
    expect(page).toMatch(/<MicAnswerPanel\s+key=\{slide\.questionId\}/);
  });
});

describe('voice mock page — typed fallback (final review)', () => {
  it('lets the learner switch to typing after a network / audio-capture error', () => {
    expect(page).toContain('onUseTyped={offersTypedFallback(mic.error)');
  });
});

describe('voice mock page — hub entry ?start=1 (spec §6, rev 3.14)', () => {
  it('auto-start defers to mockAutoStarts, so the intro shows when voice is available', () => {
    expect(page).toContain('if (!mockAutoStarts(voiceState)) return;');
  });

  it('the auto-start spinner gives way to the intro when voice is available', () => {
    expect(page).toContain("if (autoStart && stage === 'intro' && (!voiceFlags.loaded || mockAutoStarts(voiceState)))");
  });
});
