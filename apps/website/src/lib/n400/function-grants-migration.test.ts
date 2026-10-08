import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The migration runs on the shared Supabase project; this pins what it does.
// Supabase grants EXECUTE on new public functions to anon and authenticated
// directly, so REVOKE ... FROM PUBLIC alone leaves them callable over PostgREST.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_35_function_grants.sql'), 'utf8');

// Called only by triggers and other SECURITY DEFINER functions (run as owner).
const INTERNAL = [
  'n400_emit_growth_event(uuid, text, jsonb, integer, timestamp with time zone, boolean)',
  'recompute_n400_lead_score(uuid)',
  'n400_trg_account_created()',
  'n400_trg_attempt_completed()',
  'n400_trg_attempt_inserted_completed()',
  'n400_trg_cta_decision_log_gc()',
  'n400_trg_recompute_on_consultation()',
  'n400_trg_recompute_on_event()',
  'n400_trg_user_profile_events()',
];

// Called by the app with a signed-in session only.
const SIGNED_IN = [
  'finalize_mock_attempt_batch(uuid, jsonb)',
  'n400_answer_profile_prompt(text, text, text, text)',
  'n400_click_cta(text, text, text)',
  'n400_dismiss_cta(text, text, text)',
  'n400_log_cta_decision(text[], text, text)',
  'n400_mark_cta_shown(text, text, text)',
  'n400_mark_prompt_shown(text, text, text)',
  'n400_set_attribution(jsonb, jsonb)',
  'n400_skip_profile_prompt(text, text, text)',
];

describe('n400_35_function_grants', () => {
  it('takes internal functions away from every client role', () => {
    for (const fn of INTERNAL) {
      expect(sql).toContain(`REVOKE EXECUTE ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
    }
  });

  it('takes signed-in RPCs away from anon only', () => {
    for (const fn of SIGNED_IN) {
      expect(sql).toContain(`REVOKE EXECUTE ON FUNCTION public.${fn} FROM PUBLIC, anon;`);
    }
  });

  it('changes nothing else', () => {
    expect(sql.match(/^REVOKE /gm)).toHaveLength(INTERNAL.length + SIGNED_IN.length);
    expect(sql).not.toMatch(/^\s*GRANT /m);
  });
});
