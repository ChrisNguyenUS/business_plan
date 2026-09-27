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

describe('SectionMCQuiz — exam voice run', () => {
  const quiz = read('src/components/n400/speaking/SectionMCQuiz.tsx');

  it('uses the exam hook only in exam mode', () => {
    expect(quiz).toContain('useSpokenExam({ itemId: examMode && q ? q.itemId : null, voice: examMode ? examVoice : undefined })');
  });

  it('answers through the Civics mock panel: Đúng vậy locks, Nói lại once, re-ask prompt', () => {
    expect(quiz).toMatch(/exam\.voiceHere \? \(\s*<MicAnswerPanel\s+key=\{q\.itemId\}\s+variant="mock"/);
    expect(quiz).toContain('canRetry={!exam.current?.retried}');
    expect(quiz).toContain('prompt={exam.current?.reask ? dict.oral.yesNoReask : undefined}');
  });

  it('grades at Next and hands the words to the page (Review Focus 4)', () => {
    expect(quiz).toContain('const settled = exam.settle();');
    expect(quiz).toContain(
      "onAnswer(q.itemId, settled.wasCorrect, undefined, settled.answer.input === 'typed' ? 'typed' : 'voice', settled.answer);",
    );
  });

  it('Next waits for Đúng vậy on a voice item and for a pick otherwise (Review Focus 2)', () => {
    expect(quiz).toContain('const examNextBlocked = examMode && (exam.voiceHere ? exam.current?.confirmed !== true : !selected);');
    expect(quiz).toContain('disabled={examNextBlocked}');
  });
});
