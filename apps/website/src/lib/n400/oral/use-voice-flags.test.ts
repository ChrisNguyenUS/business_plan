import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the hook's flag wiring by source (speaking spec §7).
const src = readFileSync(join(process.cwd(), 'src/lib/n400/oral/use-voice-flags.ts'), 'utf8');

describe('useVoiceFlags — voice_speaking', () => {
  it('loads voice_speaking with the other voice flags', () => {
    expect(src).toContain("['voice_practice', 'voice_android', 'voice_mock', 'voice_speaking']");
  });

  it('exposes speakingOn, OFF until loaded', () => {
    expect(src).toContain("speakingOn: isFeatureOn(byKey.get('voice_speaking'), user.id)");
    expect(src).toMatch(/const OFF: VoiceFlags = \{[^}]*speakingOn: false/);
  });
});
