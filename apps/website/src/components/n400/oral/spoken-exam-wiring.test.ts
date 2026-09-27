import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Full interview voice wiring by source (speaking spec §5.2).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('useSpokenExam', () => {
  const hook = read('src/components/n400/oral/use-spoken-exam.ts');

  it('voice only in a voice run and for items that can be spoken; the rest stay multiple choice (Review Focus 2)', () => {
    expect(hook).toContain('const voiceHere = voice !== undefined && item !== null && canSpeak(item, location);');
  });

  it('confirm follows the mock rules: re-ask on unclear, retry once', () => {
    expect(hook).toContain('mockConfirm(current, text, itemInput, gradeSpokenItem(item, text, location).verdict)');
    expect(hook).toContain('mockRetry(itemInput)');
  });

  it('grades only at Next, with no verdict before (§5.1)', () => {
    const body = hook.slice(hook.indexOf('const settle'), hook.indexOf('return { wasCorrect, answer: current };'));
    expect(body).toContain("gradeSpokenItem(item, current.transcript, location).verdict === 'correct'");
    expect(body).toContain('trackOralAnswer(spokenAnswerEvent(item, current, wasCorrect, voice.context));');
  });

  it('a lost mic is latched by the page, so every remaining voice item types (Review Focus 3)', () => {
    expect(hook).toContain('voiceRunMicLost(voice.input, mic.error, mic.supported)');
    expect(hook).toContain('const micLost = (voice?.micLost ?? false) || lostNow;');
    expect(hook.match(/latchMicLost\(\);/g)).toHaveLength(3);
  });

  it('mic errors and re-asks carry the run context', () => {
    expect(hook).toContain('micErrorEvent(spokenQid(item), voice.context, micError, spokenSection(item))');
    expect(hook).toContain('mockReaskEvent(item, itemInput, next.retried, text, voice.context)');
  });
});
