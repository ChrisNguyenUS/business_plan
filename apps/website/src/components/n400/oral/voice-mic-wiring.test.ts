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

describe('🔊 plays through Web Audio while an iOS mic session runs (rev 3.12)', () => {
  it('AudioButton asks preferWebAudio at click time and plays through playWebAudio', () => {
    const btn = read('src/components/n400/AudioButton.tsx');
    expect(btn).toContain('preferWebAudio?.()');
    expect(btn).toContain('playWebAudio(');
    expect(btn.indexOf('onBeforePlay?.()')).toBeGreaterThan(-1);
    expect(btn.indexOf('onBeforePlay?.()')).toBeLessThan(btn.indexOf('audio.play()'));
  });

  it('practice and mock pick the player from the running session', () => {
    const practice = read('src/app/n400ready/(app)/practice/page.tsx');
    expect(practice.match(/preferWebAudio=\{mic\.sessionRunning\}/g)?.length).toBe(2);
    expect(practice.match(/onBeforePlay=\{mic\.noteAudioPlayed\}/g)?.length).toBe(2);
    expect(read('src/app/n400ready/(app)/mock-test/civics/page.tsx')).toContain('preferWebAudio={mic.sessionRunning}');
  });

  it('🔊 never opens the mic (no warm-up any more)', () => {
    const hook = read('src/lib/n400/oral/use-speech-recognition.ts');
    expect(hook).not.toContain('warmUp');
    expect(hook).toContain('sessionRunning');
  });
});
