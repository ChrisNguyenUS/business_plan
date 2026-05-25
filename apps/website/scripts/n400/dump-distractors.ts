import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const esc = (s: string) => s.replace(/'/g, "''");

async function fetchAll() {
  const all: { question_id: number; answer_en: string; answer_vi: string; display_order: number }[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('n400_answers')
      .select('question_id,answer_en,answer_vi,display_order')
      .eq('is_correct', false)
      .order('question_id')
      .order('display_order')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} distractors`);

  const lines: string[] = [];
  lines.push('-- N400 distractors (manually authored, civics-knowledge plausible).');
  lines.push('-- Q29 has 5 fictional Member-of-Congress placeholders; the correct answer is injected from n400_representatives at runtime.');
  lines.push('-- display_order >= 100 to avoid clashing with seeded correct answers (which start at 0).');
  lines.push('');
  lines.push('INSERT INTO public.n400_answers (question_id, answer_en, answer_vi, is_correct, display_order) VALUES');
  const tuples = rows.map((r, i) => {
    const tail = i === rows.length - 1 ? ';' : ',';
    return `  (${r.question_id}, '${esc(r.answer_en)}', '${esc(r.answer_vi)}', false, ${r.display_order})${tail}`;
  });
  lines.push(...tuples);
  lines.push('');

  const out = resolve(__dirname, '../../supabase/migrations/n400_03_distractors.sql');
  writeFileSync(out, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
