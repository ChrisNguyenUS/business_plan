import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §2.2–2.3. Server actions import next/headers, so their
// wiring is pinned by source, like navigation-ia.test.ts.
const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const actions = source('src/app/n400ready/(app)/mock-test/civics/actions.ts');
const page = source('src/app/n400ready/(app)/mock-test/civics/page.tsx');

describe('Civics mock actions (RLS hardening spec §2.2–2.3)', () => {
  it('builds the answer key with the shared builder from parsed input', () => {
    expect(actions).toContain('parseStartMockInput(input)');
    expect(actions).toContain('civicsMockAnswerKey(civicsMockSlides(kind, seed, stateCode, districtNumber))');
  });

  it('inserts the attempt with the service role, never with the session client', () => {
    expect(actions).toMatch(/createServerSupabaseClient\(\)\s*\.from\('n400_quiz_attempts'\)\s*\.insert\(/);
    expect(actions).not.toMatch(/supabase\s*\.from\('n400_quiz_attempts'\)\s*\.insert\(/);
  });

  it('fires the pass CAPI only for the standalone Civics mock', () => {
    expect(actions.match(/const capi = parseMockKind\(kind\) === 'civics'/g)).toHaveLength(2);
    expect(actions).toContain('if (passed && capi) {');
  });

  it('the standalone page registers its attempt as the civics kind', () => {
    expect(page).toContain("const args = { kind: 'civics' as const, seed, stateCode, districtNumber };");
  });
});
