import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The repo's vitest has no DOM, so the practice page's wiring is pinned by
// reading its source (same approach as mobile-layout.test.ts).
const page = readFileSync(join(process.cwd(), 'src/app/n400ready/(app)/practice/page.tsx'), 'utf8');

describe('practice page voice wiring (final review)', () => {
  it('remounts the answer panel per question so a typed answer never carries over', () => {
    expect(page).toMatch(/<MicAnswerPanel\s+key=\{question\.id\}/);
  });

  it('resets the mic when a new session starts, even on the same index', () => {
    const body = page.slice(page.indexOf('const resetQuestionUI'), page.indexOf('const reseed'));
    expect(body).toContain('resetMic()');
  });

  it('never grades a question twice', () => {
    const between = (a: string, b: string) => page.slice(page.indexOf(a), page.indexOf(b));
    expect(between('const onVoiceSubmit', 'const onNearAnswer')).toContain("phase === 'revealed'");
    expect(between('const onPick', 'const settleVoice')).toContain('voiceVerdict !== null');
  });
});

describe('practice voice wiring — rev 3.5', () => {
  const panel = readFileSync(join(process.cwd(), 'src/components/n400/oral/MicAnswerPanel.tsx'), 'utf8');

  it('never tells the learner to reload for the mic', () => {
    expect(panel).not.toContain('location.reload');
  });

  it('a stalled mic switches practice to the typed box', () => {
    expect(page).toContain("mic.error === 'stalled'");
    expect(page).toContain('setMicLost(true)');
    expect(page).toContain("const panelInput: 'mic' | 'typed' =");
  });

  it('explains the always-on mic on iPhone', () => {
    expect(panel).toContain('mic.persistent');
    expect(panel).toContain('t.hintPersistent');
  });
});
