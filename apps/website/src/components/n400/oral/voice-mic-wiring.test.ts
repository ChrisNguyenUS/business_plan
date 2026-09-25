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
