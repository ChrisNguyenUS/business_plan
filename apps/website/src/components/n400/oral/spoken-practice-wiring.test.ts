import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Speaking practice voice wiring by source (speaking spec §4).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const hook = read('src/components/n400/oral/use-spoken-practice.ts');
const panel = read('src/components/n400/oral/MicAnswerPanel.tsx');

describe('useSpokenPractice', () => {
  it('is gated by voice_speaking and starts in Trắc nghiệm (S8)', () => {
    expect(hook).toContain('enabled: opts.enabled && flags.speakingOn');
    expect(hook).toContain("useState<PracticeAnswerMode>('choice')");
  });

  it('only the switch sets the mode, so Tự nói stays on from item to item (Review Focus 4)', () => {
    expect(hook.match(/setAnswerMode\(/g)).toHaveLength(1);
  });

  it('grades through the shared S1 grader', () => {
    expect(hook).toContain('gradeSpokenItem(item, text, location)');
  });

  it('keeps one answer tagged with its item: nothing is reset during render (plan review P0-1)', () => {
    expect(hook).toContain('const answer = answerFor(stored, opts.itemId);');
    expect(hook).not.toContain('prevItemId');
  });

  it('unclear re-asks: resets the mic and never settles (Review Focus 3)', () => {
    const body = hook.slice(hook.indexOf('const onSubmit'), hook.indexOf('const onNearAnswer'));
    expect(body).toMatch(/if \(next\.reask\) \{\s*resetMic\(\);\s*return;\s*\}/);
  });

  it('a near answered with Đúng vậy / Không still sends its analytics event (D7, plan review P0-2)', () => {
    const body = hook.slice(hook.indexOf('const onNearAnswer'), hook.indexOf('const changeMode'));
    expect(body).toContain("practiceAnswerEvent(spokenQid(item), panelInput, 'near', yes, answer.text, spokenSection(item))");
  });

  it('a stalled mic shows the typed box at once and is latched in handlers, never in an effect', () => {
    expect(hook).toContain('const micLost = micLatched || stalled;');
    expect(hook.match(/latchMicLost\(\);/g)).toHaveLength(2);
  });

  it('🔊 drops an open capture window before playing (Review Focus 2)', () => {
    const body = hook.slice(hook.indexOf('const beforeAudio'), hook.indexOf('return {'));
    expect(body).toContain("if (mic.state === 'listening') resetMic();");
    expect(body).toContain('mic.noteAudioPlayed();');
  });

  it('a new item never inherits the previous capture window', () => {
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*resetMic\(\);\s*\}, \[opts\.itemId, resetMic\]\);/);
  });
});

describe('MicAnswerPanel prompt', () => {
  it('renders the prompt in the mic and the typed box', () => {
    expect(panel).toContain('prompt?: string;');
    expect(panel.match(/\{promptRow\}/g)).toHaveLength(2);
  });
});

describe('SectionYesNoQuiz — Tự nói', () => {
  const quiz = read('src/components/n400/speaking/SectionYesNoQuiz.tsx');
  const page = read('src/app/n400ready/(app)/speaking/yes-no/page.tsx');

  it('uses the hook and the Civics switch + panel', () => {
    expect(quiz).toContain('useSpokenPractice({');
    expect(quiz).toContain('<AnswerModeToggle');
    expect(quiz).toMatch(/<MicAnswerPanel\s+key=\{q\.id\}/);
  });

  it('shows the re-ask prompt for unclear', () => {
    expect(quiz).toContain('prompt={spoken.reask ? dict.oral.yesNoReask : undefined}');
  });

  it('records only settled answers, with how they were given', () => {
    expect(quiz).toContain('if (record !== null && q) onAnswer(q.id, record, via);');
    expect(quiz).toContain("onAnswer(q.id, ok, 'choice');");
  });

  it('every 🔊 uses the iOS rules; the slow 🔊 is hidden in Tự nói and while an iOS mic session is open (Review Focus 1, 2)', () => {
    expect(quiz.match(/onBeforePlay=\{spoken\.beforeAudio\}/g)).toHaveLength(2);
    expect(quiz.match(/preferWebAudio=\{spoken\.mic\.sessionRunning\}/g)).toHaveLength(2);
    expect(quiz).toMatch(/\{!spoken\.voiceHere && !spoken\.mic\.sessionRunning\(\) \? \(\s*<AudioButton src=\{audioSrc\} label=\{dict\.speaking\.yesno\.slowLabel\}/);
  });

  it('the page records answer_mode', () => {
    expect(page).toContain("onAnswer={(id, ok, via) => void recordSectionAnswer('yesno', id, ok, 'practice', via)}");
  });
});

describe('SectionMCQuiz — Tự nói (practice only)', () => {
  const quiz = read('src/components/n400/speaking/SectionMCQuiz.tsx');
  const page = read('src/app/n400ready/(app)/speaking/what-mean/page.tsx');

  it('voice is never on in exam mode — the Full interview is unchanged (Review Focus 5)', () => {
    expect(quiz).toContain('enabled: !examMode,');
  });

  it('uses the Civics switch + panel with the near prompt', () => {
    expect(quiz).toContain('<AnswerModeToggle');
    expect(quiz).toMatch(/<MicAnswerPanel\s+key=\{q\.itemId\}/);
    expect(quiz).toContain('nearAnswer={spoken.nearPrompt}');
  });

  it('a confirmed near is not recorded (D7)', () => {
    expect(quiz).toContain('if (record !== null && q) onAnswer(q.itemId, record, undefined, via);');
  });

  it('every 🔊 uses the iOS rules (Review Focus 2)', () => {
    expect(quiz.match(/onBeforePlay=\{spoken\.beforeAudio\}/g)).toHaveLength(2);
    expect(quiz.match(/preferWebAudio=\{spoken\.mic\.sessionRunning\}/g)).toHaveLength(2);
  });

  it('the page records answer_mode', () => {
    expect(page).toContain("onAnswer={(id, ok, _selected, via) => void recordSectionAnswer('whatmean', id, ok, 'practice', via)}");
  });
});
