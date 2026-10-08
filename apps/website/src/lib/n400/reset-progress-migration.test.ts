import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// RLS hardening spec §3.1. The migration runs on the shared Supabase project;
// this pins what it does.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_36_reset_my_progress.sql'), 'utf8');

describe('n400_36_reset_my_progress', () => {
  it('is a SECURITY DEFINER function of the caller only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()');
    expect(sql).toContain('SECURITY DEFINER SET search_path = public');
    expect(sql).toContain("IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;");
  });

  it('wipes every progress table of the caller and keeps badges and growth history', () => {
    for (const t of ['n400_quiz_attempts', 'n400_section_attempts', 'n400_section_mock_results', 'n400_bookmarks']) {
      expect(sql).toMatch(new RegExp(`DELETE FROM ${t}\\s+WHERE user_id = v_user;`));
    }
    expect(sql).not.toMatch(/DELETE FROM n400_(user_badges|growth_events|lead_profiles|consultation_requests|profile_prompts|user_profile)/);
    expect(sql).toContain('SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()');
    expect(sql).toContain('PERFORM recompute_n400_lead_score(v_user);');
  });

  it('anon cannot call it; signed-in users can', () => {
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;');
  });
});
