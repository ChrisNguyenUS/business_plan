import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureOpen } from '@/lib/n400/oral/mock-voice-items';

// Voice follow-ups after S1–S4 (deferred review minors, owner 2026-09-28).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('captureOpen: a 🔊 now would be heard as the answer', () => {
  it('is true while the window opens, listens or settles (the panel shows these as busy)', () => {
    expect(captureOpen('requesting_permission')).toBe(true);
    expect(captureOpen('listening')).toBe(true);
    expect(captureOpen('processing')).toBe(true);
  });

  it('is false when idle, with a transcript to confirm, or after an error (a stalled mic must stay latched)', () => {
    expect(captureOpen('idle')).toBe(false);
    expect(captureOpen('transcript')).toBe(false);
    expect(captureOpen('error')).toBe(false);
  });
});

describe('every 🔊 guard uses captureOpen', () => {
  it('practice hook, Speaking mock and Full interview', () => {
    expect(read('src/components/n400/oral/use-spoken-practice.ts')).toContain('if (captureOpen(mic.state)) resetMic();');
    expect(read('src/app/n400ready/(app)/mock-test/speaking/page.tsx')).toContain('if (captureOpen(mic.state)) resetMic();');
    expect(read('src/app/n400ready/(app)/mock-test/full/page.tsx')).toContain('if (captureOpen(mic.state)) mic.reset();');
  });
});

describe('small practice fixes', () => {
  it('tapping the mode already chosen does nothing (no lost capture, no cleared re-ask)', () => {
    expect(read('src/components/n400/oral/use-spoken-practice.ts')).toContain('if (locked || m === answerMode) return;');
  });

  it('a typed re-ask says "trả lời lại", not "nói lại"', () => {
    const vi = read('src/lib/n400/i18n/vi.ts');
    expect(vi).toContain("yesNoReaskTyped: 'Bạn trả lời Yes hay No? Hãy trả lời lại.',");
    expect(read('src/components/n400/speaking/SectionYesNoQuiz.tsx')).toContain(
      "prompt={spoken.reask ? (spoken.panelInput === 'typed' ? dict.oral.yesNoReaskTyped : dict.oral.yesNoReask) : undefined}",
    );
    const mc = read('src/components/n400/speaking/SectionMCQuiz.tsx');
    expect(mc).toContain(
      "prompt={spoken.reask ? (spoken.panelInput === 'typed' ? dict.oral.yesNoReaskTyped : dict.oral.yesNoReask) : undefined}",
    );
    expect(mc).toContain(
      "prompt={exam.current?.reask ? (exam.itemInput === 'typed' ? dict.oral.yesNoReaskTyped : dict.oral.yesNoReask) : undefined}",
    );
    expect(read('src/app/n400ready/(app)/mock-test/speaking/page.tsx')).toContain(
      "prompt={current?.reask ? (itemInput === 'typed' ? dict.oral.yesNoReaskTyped : dict.oral.yesNoReask) : undefined}",
    );
  });

  it('Làm lại keeps the preset minutes', () => {
    expect(read('src/app/n400ready/(app)/speaking/what-mean/page.tsx')).toContain(
      'onRestart={() => startPracticeWith(mode.ids.length, mode.minutes)}',
    );
    expect(read('src/app/n400ready/(app)/speaking/yes-no/page.tsx')).toContain(
      'onRestart={() => startQuizWith(mode.ids.length, mode.minutes)}',
    );
  });
});

describe('flags without a user', () => {
  it('useVoiceFlags reports loaded (all off) once auth is done with no user, so no spinner hangs', () => {
    expect(read('src/lib/n400/oral/use-voice-flags.ts')).toContain('if (!user) return authLoading ? OFF : LOADED_OFF;');
  });
});

describe('Full interview picker', () => {
  it('holds its place while the flags load in a browser that can answer by voice', () => {
    const page = read('src/app/n400ready/(app)/mock-test/full/page.tsx');
    expect(page).toContain('const pickerPending = !voiceFlags.loaded && browserCanVoice;');
    expect(page).toContain('{voiceAvailable || pickerPending ? (');
  });
});
