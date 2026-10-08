import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.4, §2.6. user-state is a React context with no DOM test
// harness here, so its write paths are pinned by source.
const src = readFileSync(join(process.cwd(), 'src/lib/n400/user-state.tsx'), 'utf8');

/** The body of one `const name = useCallback(…)`: it ends at `  }, [deps]);` or at
 *  `  );` (the multi-line style), whichever comes first. */
function callback(name: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`);
  expect(start, name).toBeGreaterThan(-1);
  const ends = ['\n  }, [', '\n  );'].map((s) => src.indexOf(s, start)).filter((i) => i > -1);
  return src.slice(start, Math.min(...ends));
}

describe('user-state writes (RLS hardening spec §2.4, §2.6)', () => {
  it('noteMockResult only updates local state: the finalize RPC already wrote the attempt', () => {
    const body = callback('noteMockResult');
    expect(body).toContain('mockResults: [...s.mockResults, result].slice(-100)');
    expect(body).not.toContain('supabase');
  });

  it('Reset goes through the wipe-all RPC, not table-by-table deletes', () => {
    const body = callback('resetAll');
    expect(body).toContain("supabase.rpc('n400_reset_my_progress')");
    expect(body).not.toContain('.delete()');
  });

  it('Reset keeps the address and settings locally, as the RPC keeps them (final review #3)', () => {
    const body = callback('resetAll');
    expect(body).toContain('setState((s) => ({ ...DEFAULT_STATE, settings: s.settings, address: s.address }));');
  });

  it('exposes noteMockResult', () => {
    expect(src).toMatch(/\n {4}noteMockResult,\n/);
  });

  it('never writes a mock_test attempt from the browser (n400_37 relies on it)', () => {
    expect(src).not.toContain('recordMockResult');
    expect(src).not.toContain('mockQuizAttemptRow');
    expect(src).not.toContain('mockQuestionAttemptRows');
  });
});
