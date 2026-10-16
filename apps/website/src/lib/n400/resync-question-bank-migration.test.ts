import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { N400_CATEGORY_LABELS, N400_QUESTIONS } from './questions-data';
import { N400_DISTRACTORS } from './distractors-data';

// n400_39 copies the learner bank into the admin tables. Pins its rows to the
// static files so the two copies cannot drift apart again unnoticed.
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/n400_39_resync_question_bank.sql'), 'utf8');
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const valueRows = (table: string) =>
  sql.split(`INSERT INTO ${table} `)[1].split(';\n')[0].split('\n').filter((l) => l.startsWith('  ('));

describe('n400_39_resync_question_bank', () => {
  it('has exactly the 128 learner questions', () => {
    const expected = N400_QUESTIONS.map(
      (q) =>
        `(${q.id}, ${lit(N400_CATEGORY_LABELS[q.category].en)}, ${lit(q.questionEn)}, ${lit(q.questionVi)}, ${q.isLocationBased})`,
    );
    expect(valueRows('n400_39_q').map((l) => l.trim().replace(/,$/, ''))).toEqual(expected);
  });

  it('has exactly the learner answers and distractors', () => {
    const expected = N400_QUESTIONS.flatMap((q) => [
      ...q.answersEn.map((en, i) => `(${q.id}, ${lit(en)}, ${lit(q.answersVi[i])}, true, ${i})`),
      ...(N400_DISTRACTORS[q.id] ?? []).map((d, i) => `(${q.id}, ${lit(d.en)}, ${lit(d.vi)}, false, ${100 + i})`),
    ]);
    expect(valueRows('n400_39_a').map((l) => l.trim().replace(/,$/, ''))).toEqual(expected);
  });

  it('keeps ids and audio, soft-deletes replaced answers, never hard-deletes', () => {
    const code = sql.replace(/--.*$/gm, '');
    expect(code).not.toMatch(/DELETE FROM|TRUNCATE|question_audio_url\s*=/);
    expect(code).toContain('SET deleted_at = NOW()');
    expect(code).toContain('CASE WHEN s.is_correct AND s.display_order = 0 THEN c.audio_url END');
  });
});
