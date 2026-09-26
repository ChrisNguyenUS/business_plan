import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Thi thử Speaking voice wiring by source (speaking spec §5.1).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('MockResultScreen — voice rows', () => {
  const screen = read('src/components/n400/MockResultScreen.tsx');

  it('a row can say "Bạn nói:" instead of the screen-wide label', () => {
    expect(screen).toMatch(/export interface MockResultRow \{[^}]*userAnswerLabel\?: string;/);
    expect(screen).toContain('{row.userAnswerLabel ?? effectiveUserAnswerLabel} ');
  });

  it("the rows' 🔊 can follow the iOS rules (Review Focus 3)", () => {
    expect(screen).toContain('onBeforePlay={onBeforePlay}');
    expect(screen).toContain('preferWebAudio={preferWebAudio}');
  });
});
