import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseQuestionsMarkdown } from '../../src/lib/n400/parse-questions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const root = resolve(__dirname, '../../../..');
  const enMd = readFileSync(resolve(root, 'docs/N400_questions_en.md'), 'utf-8');
  const viMd = readFileSync(resolve(root, 'docs/N400_questions_vi.md'), 'utf-8');

  const questions = parseQuestionsMarkdown(enMd, viMd);
  console.log(`Parsed ${questions.length} questions`);

  for (const q of questions) {
    const { error: qErr } = await supabase.from('n400_questions').upsert(
      {
        id: q.id,
        category: q.category,
        question_en: q.question_en,
        question_vi: q.question_vi,
        is_location_based: q.is_location_based,
      },
      { onConflict: 'id' }
    );
    if (qErr) throw new Error(`Q${q.id}: ${qErr.message}`);

    // Q29 has zero correct rows in n400_answers (correct comes from n400_representatives at runtime).
    if (q.id === 29) {
      process.stdout.write(`\rSeeded Q${q.id}/${questions.length} (skipped correct answers)`);
      continue;
    }

    // Clear existing correct rows so re-runs are idempotent (preserves distractors with display_order >= 100).
    const { error: delErr } = await supabase
      .from('n400_answers')
      .delete()
      .eq('question_id', q.id)
      .eq('is_correct', true);
    if (delErr) throw new Error(`Q${q.id} clear: ${delErr.message}`);

    for (let i = 0; i < q.answers_en.length; i++) {
      const { error: aErr } = await supabase.from('n400_answers').insert({
        question_id: q.id,
        answer_en: q.answers_en[i],
        answer_vi: q.answers_vi[i] ?? q.answers_en[i],
        is_correct: true,
        display_order: i,
      });
      if (aErr) throw new Error(`Q${q.id} answer ${i}: ${aErr.message}`);
    }

    process.stdout.write(`\rSeeded Q${q.id}/${questions.length}`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
