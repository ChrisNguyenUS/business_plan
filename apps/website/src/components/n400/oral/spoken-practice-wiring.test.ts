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
