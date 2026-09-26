import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Speaking spec §6. The migration runs on the shared Supabase project after owner
// approval; this pins what it does.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_34_speaking_voice.sql'), 'utf8');

describe('n400_34_speaking_voice', () => {
  it('adds answer_mode to both Speaking tables, defaulting to choice', () => {
    for (const table of ['n400_section_attempts', 'n400_section_mock_results']) {
      expect(sql).toContain(`ALTER TABLE public.${table}\n  ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'choice';`);
      expect(sql).toContain(`ADD CONSTRAINT ${table}_answer_mode_check`);
    }
    expect(sql.match(/CHECK \(answer_mode IN \('choice', 'voice', 'typed'\)\)/g)).toHaveLength(2);
  });

  it('seeds voice_speaking OFF, using the flags table note column', () => {
    expect(sql).toContain("('voice_speaking', FALSE, 100,");
    expect(sql).toContain('(flag_key, enabled, rollout_pct, note)');
    expect(sql).toContain('ON CONFLICT (flag_key) DO NOTHING');
  });
});
