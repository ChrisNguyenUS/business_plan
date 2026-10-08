import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.2. Pins what the migration does on the shared project.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_37_civics_mock_lockdown.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('n400_37_civics_mock_lockdown', () => {
  it('the owner inserts practice envelopes only, never an answer key', () => {
    expect(code).toContain('DROP POLICY IF EXISTS "n400 attempts own insert" ON public.n400_quiz_attempts;');
    expect(code).toMatch(
      /CREATE POLICY "n400 attempts own practice insert" ON public\.n400_quiz_attempts\s+FOR INSERT TO authenticated\s+WITH CHECK \(user_id = \(select auth\.uid\(\)\)\s+AND mode IN \('practice', 'flashcard'\)\s+AND slide_manifest IS NULL\);/,
    );
  });

  it('the owner reads own answers and writes word-free answers under own practice attempts only', () => {
    expect(code).toContain('DROP POLICY IF EXISTS "n400 question attempts own" ON public.n400_question_attempts;');
    expect(code).toContain('CREATE POLICY "n400 question attempts own select" ON public.n400_question_attempts');
    expect(code).toContain('CREATE POLICY "n400 question attempts own practice insert" ON public.n400_question_attempts');
    expect(code).toContain('WITH CHECK (transcript IS NULL');
    expect(code).toContain("AND a.mode IN ('practice', 'flashcard')));");
    expect(code).not.toMatch(/FOR (ALL|UPDATE|DELETE)/);
  });

  it('both owner finalize RPCs refuse anything but a mock_test attempt, and grading is unchanged', () => {
    expect(code.match(/IF v_user_id IS DISTINCT FROM auth\.uid\(\) OR v_mode IS DISTINCT FROM 'mock_test' THEN/g)).toHaveLength(2);
    expect(code).toContain("(pick->>'selected') = (slide->>'correct')");
  });

  it('retires the RPCs the app no longer calls', () => {
    for (const fn of ['finalize_mock_attempt(uuid)', 'submit_mock_answer(uuid, integer, text)', 'finalize_practice_attempt(uuid)']) {
      expect(code).toContain(`REVOKE EXECUTE ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
    }
  });
});
