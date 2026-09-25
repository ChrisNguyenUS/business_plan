import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('mic session wiring (spec D15)', () => {
  it('the app layout owns one mic controller for every screen', () => {
    expect(read('src/app/n400ready/(app)/layout.tsx')).toContain('<VoiceMicProvider>');
  });

  it('a hidden tab never aborts a persistent session', () => {
    const provider = read('src/components/n400/oral/VoiceMicProvider.tsx');
    expect(provider).toContain("document.visibilityState === 'hidden' && !controller.persistent");
  });

  it('leaving a screen only resets its capture window', () => {
    expect(read('src/lib/n400/oral/use-speech-recognition.ts')).toContain('return () => shared.reset();');
  });

  it('iOS gets the persistent controller', () => {
    const hook = read('src/lib/n400/oral/use-speech-recognition.ts');
    expect(hook).toContain('isIOSDevice(navigator.userAgent');
    expect(hook).toContain('new PersistentSpeechController(deps)');
  });
});

describe('🔊 marks the iOS session for a restart (spec D15, rev 3.7)', () => {
  it('AudioButton calls onBeforePlay before play()', () => {
    const btn = read('src/components/n400/AudioButton.tsx');
    expect(btn.indexOf('onBeforePlay?.()')).toBeGreaterThan(-1);
    expect(btn.indexOf('onBeforePlay?.()')).toBeLessThan(btn.indexOf('audio.play()'));
  });

  it('practice and mock report playback to the mic', () => {
    expect(read('src/app/n400ready/(app)/practice/page.tsx').match(/onBeforePlay=\{mic\.noteAudioPlayed\}/g)?.length).toBe(2);
    expect(read('src/app/n400ready/(app)/mock-test/civics/page.tsx')).toContain('onBeforePlay={mic.noteAudioPlayed}');
  });

  it('🔊 opens the mic first only once voice has worked here (no surprise prompt)', () => {
    const hook = read('src/lib/n400/oral/use-speech-recognition.ts');
    expect(hook).toContain('USED_KEY');
    expect(hook).toContain('if (readUsed()) controller.warmUp();');
  });
});
