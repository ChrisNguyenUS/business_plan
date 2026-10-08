import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.3. Pins the shape of the rewrite; the before/after access
// matrix on prod (plan Task 11) proves nobody's access changed.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_38_rls_perf.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');
const policies = code.match(/CREATE POLICY [\s\S]*?;/g) ?? [];

describe('n400_38_rls_perf', () => {
  it('runs every auth check once per query', () => {
    expect(code).not.toMatch(/(?<!select )auth\.uid\(\)/);
    expect(code).not.toMatch(/(?<!select public\.)is_admin\(\)/);
    expect(code).not.toMatch(/(?<!select public\.)is_staff_or_admin\(\)/);
    expect(code).not.toContain('auth.role()');
    expect(code).not.toMatch(/FROM profiles/i);
  });

  it('replaces 43 policies with 65 and never uses FOR ALL', () => {
    expect(code.match(/^DROP POLICY IF EXISTS /gm)).toHaveLength(43);
    expect(policies).toHaveLength(65);
    expect(code).not.toMatch(/FOR ALL/);
  });

  it('one permissive policy per table, role and action', () => {
    const seen = new Set<string>();
    for (const p of policies) {
      const m = p.match(/ON public\.(\w+)\s+FOR (SELECT|INSERT|UPDATE|DELETE) TO (anon|authenticated)\b/);
      expect(m, p).not.toBeNull();
      const key = `${m![1]} ${m![2]} ${m![3]}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('helper-calling policies are for authenticated only', () => {
    for (const p of policies) {
      if (/is_(staff_or_)?admin\(\)/.test(p)) expect(p, p).toMatch(/ TO authenticated\b/);
    }
  });

  it('keeps the public lookup reads and the n400_37 insert policies', () => {
    for (const name of ['n400 location answers public read', 'n400 state data public read', 'n400 reps public read', 'n400_badges_read_all', 'n400 attempts own practice insert', 'n400 question attempts own practice insert']) {
      expect(code).not.toContain(`"${name}"`);
    }
  });

  it('indexes the four unindexed foreign keys', () => {
    for (const idx of [
      'n400_bookmarks_question_id_idx ON public.n400_bookmarks (question_id)',
      'n400_consultation_requests_user_id_idx ON public.n400_consultation_requests (user_id)',
      'n400_user_badges_slug_idx ON public.n400_user_badges (slug)',
      'n400_user_badges_trigger_attempt_id_idx ON public.n400_user_badges (trigger_attempt_id)',
    ]) {
      expect(code).toContain(`CREATE INDEX IF NOT EXISTS ${idx};`);
    }
  });
});
