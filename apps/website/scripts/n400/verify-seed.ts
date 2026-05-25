import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fail: string[] = [];
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const bad = (msg: string) => {
  console.log(`  ✗ ${msg}`);
  fail.push(msg);
};

async function check<T>(label: string, fn: () => Promise<T>): Promise<T> {
  console.log(`\n${label}`);
  return fn();
}

// Supabase JS client caps at 1000 rows; paginate so we see every row.
async function fetchAll<T>(
  query: () => ReturnType<typeof supabase.from>,
  build: (q: any) => any
): Promise<T[]> {
  const all: T[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await build(query()).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  await check('1. Question count', async () => {
    const { count, error } = await supabase
      .from('n400_questions')
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    if (count === 128) ok(`128 questions present`);
    else bad(`expected 128, got ${count}`);
  });

  await check('2. Per-question answer counts', async () => {
    const data = await fetchAll<{ question_id: number; is_correct: boolean }>(
      () => supabase.from('n400_answers'),
      (q) => q.select('question_id,is_correct')
    );
    const tally = new Map<number, { correct: number; distractors: number }>();
    for (let i = 1; i <= 128; i++) tally.set(i, { correct: 0, distractors: 0 });
    for (const r of data ?? []) {
      const t = tally.get(r.question_id)!;
      if (r.is_correct) t.correct++;
      else t.distractors++;
    }
    for (let id = 1; id <= 128; id++) {
      const t = tally.get(id)!;
      if (id === 29) {
        if (t.correct !== 0) bad(`Q29 must have 0 correct rows (got ${t.correct})`);
      } else if (t.correct < 1) {
        bad(`Q${id} has ${t.correct} correct (need ≥1)`);
      }
      if (t.distractors < 5) bad(`Q${id} has ${t.distractors} distractors (need ≥5)`);
    }
    ok(`128 questions checked: ≥1 correct (Q29 = 0) and ≥5 distractors each`);
  });

  await check('3. Jurisdictions (n400_state_data)', async () => {
    const { count, error } = await supabase
      .from('n400_state_data')
      .select('state_code', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    if (count === 56) ok(`56 jurisdictions`);
    else bad(`expected 56, got ${count}`);
  });

  await check('4. Location answers per question', async () => {
    const { data, error } = await supabase
      .from('n400_location_answers')
      .select('question_id');
    if (error) throw new Error(error.message);
    const counts: Record<number, number> = {};
    for (const r of data ?? []) counts[r.question_id] = (counts[r.question_id] ?? 0) + 1;
    const expected: Record<number, number> = { 23: 100, 61: 56, 62: 50 };
    for (const [qid, want] of Object.entries(expected)) {
      const got = counts[Number(qid)] ?? 0;
      if (got === want) ok(`Q${qid}: ${got} location answers`);
      else bad(`Q${qid}: expected ${want} location answers, got ${got}`);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 206) ok(`Total location answers = 206`);
    else bad(`Total location answers expected 206, got ${total}`);
  });

  await check('5. Representatives count', async () => {
    const { count, error } = await supabase
      .from('n400_representatives')
      .select('state_code', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    if (count === 441) ok(`441 representatives`);
    else bad(`expected 441, got ${count}`);
  });

  await check('6. Distractor uniqueness within question', async () => {
    const data = await fetchAll<{ question_id: number; answer_en: string; is_correct: boolean }>(
      () => supabase.from('n400_answers'),
      (q) => q.select('question_id,answer_en,is_correct').eq('is_correct', false)
    );
    const seen = new Map<string, number>();
    let dupes = 0;
    for (const r of data ?? []) {
      const key = `${r.question_id}::${r.answer_en.toLowerCase()}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, n] of seen) {
      if (n > 1) {
        bad(`duplicate distractor: ${key} (×${n})`);
        dupes++;
      }
    }
    if (dupes === 0) ok(`no duplicate distractors within any question`);
  });

  await check('7. No distractor collides with a correct answer (same question)', async () => {
    const data = await fetchAll<{ question_id: number; answer_en: string; is_correct: boolean }>(
      () => supabase.from('n400_answers'),
      (q) => q.select('question_id,answer_en,is_correct')
    );
    const correct = new Map<number, Set<string>>();
    for (const r of data ?? []) {
      if (!r.is_correct) continue;
      const s = correct.get(r.question_id) ?? new Set();
      s.add(r.answer_en.toLowerCase());
      correct.set(r.question_id, s);
    }
    let collisions = 0;
    for (const r of data ?? []) {
      if (r.is_correct) continue;
      if (correct.get(r.question_id)?.has(r.answer_en.toLowerCase())) {
        bad(`Q${r.question_id} distractor "${r.answer_en}" matches a correct answer`);
        collisions++;
      }
    }
    if (collisions === 0) ok(`no distractor matches a correct answer in the same question`);
  });

  await check('8. Q29 distractors do not collide with reps or senators', async () => {
    const [{ data: q29 }, { data: reps }, { data: states }] = await Promise.all([
      supabase.from('n400_answers').select('answer_en').eq('question_id', 29).eq('is_correct', false),
      supabase.from('n400_representatives').select('rep_name'),
      supabase.from('n400_state_data').select('senator_1,senator_2'),
    ]);
    const real = new Set<string>();
    (reps ?? []).forEach((r) => real.add(r.rep_name.toLowerCase()));
    (states ?? []).forEach((s) => {
      if (s.senator_1) real.add(s.senator_1.toLowerCase());
      if (s.senator_2) real.add(s.senator_2.toLowerCase());
    });
    let collisions = 0;
    for (const r of q29 ?? []) {
      if (real.has(r.answer_en.toLowerCase())) {
        bad(`Q29 distractor "${r.answer_en}" collides with a real rep or senator`);
        collisions++;
      }
    }
    if (collisions === 0) ok(`Q29 fictional rep pool has no real-name collisions`);
  });

  console.log('');
  if (fail.length > 0) {
    console.error(`✗ verify-seed FAILED with ${fail.length} issue(s)`);
    process.exit(1);
  }
  console.log('✓ verify-seed PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
