import { describe, expect, it } from 'vitest';
import { oralDebugEnabled, oralDebugLines, oralDebugLog } from './oral-debug';

describe('oral debug log', () => {
  it('is off without a browser (SSR / node)', () => {
    expect(oralDebugEnabled()).toBe(false);
  });

  it('timestamps lines and keeps the last 200', () => {
    for (let i = 0; i < 205; i++) oralDebugLog(`e${i}`);
    const lines = oralDebugLines();
    expect(lines).toHaveLength(200);
    expect(lines[199]).toMatch(/^\d+\.\d{2}s e204$/);
  });
});
