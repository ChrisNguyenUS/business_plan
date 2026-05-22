# N400 App — Phase 1: DB Schema + Seed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all Supabase DB tables, RLS policies, seed 128 civics questions (EN+VI), 50-state data, 435 congressional reps, and AI-generated distractors reviewed by user.

**Architecture:** SQL migrations in `apps/website/supabase/migrations/`. Seed scripts in `apps/website/scripts/n400/`. Pure TypeScript scripts run with `npx tsx`. Vitest for unit tests on seed parsing logic.

**Tech Stack:** Supabase Postgres, `@supabase/supabase-js`, `tsx`, `vitest`.

**Prerequisites:**
- `docs/N400_questions_en.md` and `docs/N400_questions_vi.md` must be populated (both are ✅).
- **Migration `apps/internal_app/supabase/migrations/003_role_unification.sql` must already be applied** to the shared Supabase project (`ffsrlmtqzlidnuitkdvw`). This migration unifies `profiles.role` to `('admin','staff','client')` — every n400 admin RLS policy below depends on `role = 'admin'`. Verify with: `SELECT DISTINCT role FROM public.profiles;` (should not return `'user'` or `'ultimate_admin'`).
- The shared `profiles` table exists with the auto-create trigger `on_auth_user_created`. New n400 user signups inherit role = `'client'`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/n400_01_tables.sql` | Create | All n400_* tables + RLS |
| `supabase/migrations/n400_02_state_data.sql` | Create | Seed 50 states static data |
| `scripts/n400/parse-questions.ts` | Create | Parse EN+VI markdown → structured JSON |
| `scripts/n400/seed-questions.ts` | Create | Insert parsed questions + answers into DB |
| `scripts/n400/generate-distractors.ts` | Create | Call Claude API → output distractors CSV for review |
| `scripts/n400/import-distractors.ts` | Create | Import reviewed CSV → insert into n400_answers |
| `scripts/n400/seed-reps.ts` | Create | Seed 435 congressional reps from CSV |
| `scripts/n400/verify-seed.ts` | Create | Verify all 128 questions have ≥1 correct + ≥3 distractors |
| `src/lib/n400/parse-questions.ts` | Create | Shared parser (used by seed script + tests) |
| `src/lib/n400/parse-questions.test.ts` | Create | Unit tests for parser |

---

## Task 1: Install vitest + write failing parser test

**Files:**
- Modify: `apps/website/package.json`
- Create: `apps/website/src/lib/n400/parse-questions.test.ts`

- [ ] **Step 1: Install vitest**

```bash
cd apps/website && npm install --save-dev vitest@2.1.8
```

Add to `apps/website/package.json` scripts section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create test file**

Create `apps/website/src/lib/n400/parse-questions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseQuestionsMarkdown } from './parse-questions'

const EN = `## PART A: Principles of American Democracy
**1. What is the form of government of the United States?**
* Republic
* Constitution-based federal republic

**2. What is the supreme law of the land?**
* The (U.S.) Constitution
`

const VI = `## PHẦN A: Các Nguyên Tắc Dân Chủ Hoa Kỳ
**1. Hình thức chính phủ của Hoa Kỳ là gì?**
* Cộng hòa
* Cộng hòa liên bang dựa trên Hiến pháp

**2. Luật tối cao của quốc gia là gì?**
* Hiến pháp
`

describe('parseQuestionsMarkdown', () => {
  it('returns correct question count', () => {
    expect(parseQuestionsMarkdown(EN, VI)).toHaveLength(2)
  })

  it('parses id, EN question, VI question, category', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0]
    expect(q.id).toBe(1)
    expect(q.question_en).toBe('What is the form of government of the United States?')
    expect(q.question_vi).toBe('Hình thức chính phủ của Hoa Kỳ là gì?')
    expect(q.category).toBe('Principles of American Democracy')
  })

  it('parses correct answers in both languages', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0]
    expect(q.answers_en).toEqual(['Republic', 'Constitution-based federal republic'])
    expect(q.answers_vi).toEqual(['Cộng hòa', 'Cộng hòa liên bang dựa trên Hiến pháp'])
  })

  it('marks location-based questions (Q23, Q29, Q61, Q62)', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0]
    expect(q.is_location_based).toBe(false)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd apps/website && npm test -- src/lib/n400/parse-questions.test.ts
```

Expected output: `Error: Cannot find module './parse-questions'`

- [ ] **Step 4: Commit failing test**

```bash
git add apps/website/package.json apps/website/src/lib/n400/parse-questions.test.ts
git commit -m "test(n400): add failing unit tests for markdown question parser"
```

---

## Task 2: Implement markdown parser (make tests pass)

**Files:**
- Create: `apps/website/src/lib/n400/parse-questions.ts`

- [ ] **Step 1: Create parser**

Create `apps/website/src/lib/n400/parse-questions.ts`:

```typescript
export interface ParsedQuestion {
  id: number
  category: string
  question_en: string
  question_vi: string
  answers_en: string[]
  answers_vi: string[]
  is_location_based: boolean
}

const LOCATION_BASED_IDS = new Set([23, 29, 61, 62])

function extractCategory(line: string): string | null {
  // Matches "## PART A: Principles of American Democracy" or "## PHẦN A: ..."
  const match = line.match(/^##\s+(?:PART|PHẦN)\s+\w+:\s+(.+)/)
  return match ? match[1].trim() : null
}

function extractQuestion(line: string): { id: number; text: string } | null {
  // Matches "**1. What is the form..."
  const match = line.match(/^\*\*(\d+)\.\s+(.+?)\*\*$/)
  if (!match) return null
  return { id: parseInt(match[1], 10), text: match[2].trim() }
}

function extractAnswer(line: string): string | null {
  const match = line.match(/^\*\s+(.+)/)
  return match ? match[1].trim() : null
}

function parseOneLang(markdown: string): Map<number, { category: string; question: string; answers: string[] }> {
  const result = new Map()
  let currentCategory = ''
  let currentId: number | null = null
  let currentQuestion = ''
  let currentAnswers: string[] = []

  const flush = () => {
    if (currentId !== null) {
      result.set(currentId, { category: currentCategory, question: currentQuestion, answers: currentAnswers })
    }
  }

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    const cat = extractCategory(line)
    if (cat) { currentCategory = cat; continue }

    const q = extractQuestion(line)
    if (q) {
      flush()
      currentId = q.id
      currentQuestion = q.text
      currentAnswers = []
      continue
    }

    const ans = extractAnswer(line)
    if (ans && currentId !== null) currentAnswers.push(ans)
  }
  flush()
  return result
}

export function parseQuestionsMarkdown(enMarkdown: string, viMarkdown: string): ParsedQuestion[] {
  const enMap = parseOneLang(enMarkdown)
  const viMap = parseOneLang(viMarkdown)
  const results: ParsedQuestion[] = []

  for (const [id, en] of enMap) {
    const vi = viMap.get(id)
    if (!vi) throw new Error(`Missing VI translation for question ${id}`)
    results.push({
      id,
      category: en.category,
      question_en: en.question,
      question_vi: vi.question,
      answers_en: en.answers,
      answers_vi: vi.answers,
      is_location_based: LOCATION_BASED_IDS.has(id),
    })
  }

  return results.sort((a, b) => a.id - b.id)
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
cd apps/website && npm test -- src/lib/n400/parse-questions.test.ts
```

Expected: `4 tests passed`

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/parse-questions.ts
git commit -m "feat(n400): implement markdown question parser"
```

---

## Task 3: DB migration — all n400_* tables + RLS

**Files:**
- Create: `apps/website/supabase/migrations/n400_01_tables.sql`

- [ ] **Step 1: Create migration file**

Create `apps/website/supabase/migrations/n400_01_tables.sql`:

```sql
-- N400 Civics Test App — Table Definitions
-- Run in Supabase SQL Editor or via supabase db push

-- ── Content tables (public read, admin write) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.n400_questions (
  id              INT PRIMARY KEY CHECK (id BETWEEN 1 AND 128),
  category        TEXT NOT NULL,
  question_en     TEXT NOT NULL,
  question_vi     TEXT NOT NULL,
  question_audio_url TEXT,
  is_location_based BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,            -- soft delete; preserves attempt history
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     INT NOT NULL REFERENCES public.n400_questions(id) ON DELETE CASCADE,
  answer_en       TEXT NOT NULL,
  answer_vi       TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  answer_audio_url TEXT,
  display_order   INT NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_location_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     INT NOT NULL REFERENCES public.n400_questions(id) ON DELETE CASCADE,
  state_code      CHAR(2) NOT NULL,
  answer_en       TEXT NOT NULL,
  answer_vi       TEXT NOT NULL,
  answer_audio_url TEXT,
  UNIQUE (question_id, state_code, answer_en)  -- Q23 stores 2 rows per state (one per senator)
);

CREATE TABLE IF NOT EXISTS public.n400_state_data (
  state_code      CHAR(2) PRIMARY KEY,
  state_name_en   TEXT NOT NULL,
  state_name_vi   TEXT NOT NULL,
  governor_name   TEXT NOT NULL,
  capital_city    TEXT,                      -- NULL for territories (no recorded capital in v1)
  senator_1       TEXT,                      -- NULL for territories (no voting senators)
  senator_2       TEXT                       -- NULL for territories (no voting senators)
);

CREATE TABLE IF NOT EXISTS public.n400_representatives (
  state_code      CHAR(2) NOT NULL,
  district_number INT NOT NULL,
  rep_name        TEXT NOT NULL,
  rep_audio_url   TEXT,
  PRIMARY KEY (state_code, district_number)
);

-- ── User tables (user-scoped RLS) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.n400_user_profile (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city            TEXT,
  state_code      CHAR(2),
  zipcode         CHAR(5),
  district_number INT,
  district_resolved_at TIMESTAMPTZ,
  current_streak  INT NOT NULL DEFAULT 0,
  longest_streak  INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL CHECK (mode IN ('practice', 'mock_test', 'flashcard')),
  score           INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  passed          BOOLEAN,
  slide_manifest  JSONB,                       -- server-built per-question correct-answer set, used for grading (mock_test only)
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.n400_question_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES public.n400_quiz_attempts(id) ON DELETE CASCADE,
  question_id     INT NOT NULL REFERENCES public.n400_questions(id),
  was_correct     BOOLEAN NOT NULL,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_n400_answers_question_id ON public.n400_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_n400_location_answers_question_state ON public.n400_location_answers(question_id, state_code);
CREATE INDEX IF NOT EXISTS idx_n400_quiz_attempts_user_id ON public.n400_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_n400_question_attempts_attempt_id ON public.n400_question_attempts(attempt_id);
CREATE INDEX IF NOT EXISTS idx_n400_question_attempts_question_id ON public.n400_question_attempts(question_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.n400_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_location_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_state_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_question_attempts ENABLE ROW LEVEL SECURITY;

-- Public read for content tables (only non-deleted)
CREATE POLICY "n400 questions public read" ON public.n400_questions FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "n400 answers public read" ON public.n400_answers FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "n400 location answers public read" ON public.n400_location_answers FOR SELECT USING (true);
CREATE POLICY "n400 state data public read" ON public.n400_state_data FOR SELECT USING (true);
CREATE POLICY "n400 reps public read" ON public.n400_representatives FOR SELECT USING (true);

-- Admin write for content tables (reuse profiles.role pattern)
-- IMPORTANT: FOR ALL needs both USING (read/update/delete) and WITH CHECK (insert/update).
CREATE POLICY "n400 questions admin write" ON public.n400_questions FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 answers admin write" ON public.n400_answers FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 location answers admin write" ON public.n400_location_answers FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 state data admin write" ON public.n400_state_data FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 reps admin write" ON public.n400_representatives FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- User profile: own row only — both USING and WITH CHECK so INSERT cannot smuggle another user_id
CREATE POLICY "n400 user profile own read" ON public.n400_user_profile FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "n400 user profile own write" ON public.n400_user_profile FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n400 user profile admin read" ON public.n400_user_profile FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Quiz attempts: INSERT + SELECT only for users. No UPDATE — finalization goes through
-- the finalize_mock_attempt / finalize_practice_attempt SECURITY DEFINER RPCs (added in Phase 4).
-- This prevents a client from calling supabase.update({ passed: true }) to spoof a pass.
CREATE POLICY "n400 attempts own insert" ON public.n400_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n400 attempts own select" ON public.n400_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "n400 attempts admin read" ON public.n400_quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Question attempts: via attempt ownership. WITH CHECK runs the same subquery on insert.
CREATE POLICY "n400 question attempts own" ON public.n400_question_attempts FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.n400_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.n400_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "n400 question attempts admin read" ON public.n400_question_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Storage RLS for n400-audio bucket ──────────────────────────────────────
-- Public read, admin write only. Run AFTER bucket is created in Phase 2.
-- (Stub here for documentation; actual policy creation goes in Phase 2 Task 3.)
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy the SQL above and run it in the Supabase dashboard SQL Editor for project `ffsrlmtqzlidnuitkdvw`.

Verify by running:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'n400_%'
ORDER BY table_name;
```

Expected: 8 rows (`n400_answers`, `n400_location_answers`, `n400_question_attempts`, `n400_questions`, `n400_quiz_attempts`, `n400_representatives`, `n400_state_data`, `n400_user_profile`).

- [ ] **Step 3: Commit migration file**

```bash
git add apps/website/supabase/migrations/n400_01_tables.sql
git commit -m "db(n400): add all n400 tables, indexes, and RLS policies"
```

---

## Task 4: Seed script — parse markdown + insert questions + correct answers

**Files:**
- Create: `apps/website/scripts/n400/seed-questions.ts`

- [ ] **Step 1: Create seed script**

Create `apps/website/scripts/n400/seed-questions.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseQuestionsMarkdown } from '../../src/lib/n400/parse-questions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const root = resolve(__dirname, '../../../..')
  const enMd = readFileSync(resolve(root, 'docs/N400_questions_en.md'), 'utf-8')
  const viMd = readFileSync(resolve(root, 'docs/N400_questions_vi.md'), 'utf-8')

  const questions = parseQuestionsMarkdown(enMd, viMd)
  console.log(`Parsed ${questions.length} questions`)

  for (const q of questions) {
    const { error: qErr } = await supabase.from('n400_questions').upsert({
      id: q.id,
      category: q.category,
      question_en: q.question_en,
      question_vi: q.question_vi,
      is_location_based: q.is_location_based,
    }, { onConflict: 'id' })
    if (qErr) throw new Error(`Q${q.id}: ${qErr.message}`)

    for (let i = 0; i < q.answers_en.length; i++) {
      const { error: aErr } = await supabase.from('n400_answers').insert({
        question_id: q.id,
        answer_en: q.answers_en[i],
        answer_vi: q.answers_vi[i] ?? q.answers_en[i],
        is_correct: true,
        display_order: i,
      })
      if (aErr) throw new Error(`Q${q.id} answer ${i}: ${aErr.message}`)
    }

    process.stdout.write(`\rSeeded Q${q.id}/${questions.length}`)
  }

  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run seed script**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/n400/seed-questions.ts
```

Expected output:
```
Parsed 128 questions
Seeded Q128/128
Done.
```

- [ ] **Step 3: Verify in Supabase**

```sql
SELECT COUNT(*) FROM n400_questions;  -- expect 128
SELECT COUNT(*) FROM n400_answers WHERE is_correct = true;  -- expect ~500
SELECT id, question_en FROM n400_questions WHERE is_location_based = true ORDER BY id;
-- expect: 23, 29, 61, 62
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/scripts/n400/seed-questions.ts
git commit -m "feat(n400): add seed script for 128 questions and correct answers"
```

---

## Task 5: Generate distractors via Claude API → CSV for review

**Files:**
- Create: `apps/website/scripts/n400/generate-distractors.ts`
- Output: `apps/website/scripts/n400/distractors-review.csv` (gitignored, user reviews this)

**Targets:** ≥5 distractors per non-Q29 question (so the strict session-collision filter at quiz time has headroom). Q29 gets a curated pool of "Member of Congress" placeholders — see Step 6 below.

- [ ] **Step 1: Add to .gitignore**

Add to `apps/website/.gitignore` (or root `.gitignore`):
```
scripts/n400/distractors-review.csv
scripts/n400/distractors-approved.csv
```

- [ ] **Step 2: Create generator script**

Create `apps/website/scripts/n400/generate-distractors.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Q29 has its own curated pool — skip in the LLM generator (handled in Step 6).
const SKIP_IDS = new Set([29])
const DISTRACTORS_PER_QUESTION = 5

async function generateDistractors(
  questionId: number,
  questionEn: string,
  correctAnswers: string[],
  category: string
): Promise<{ en: string; vi: string }[]> {
  const prompt = `You are helping create a civics test practice app for Vietnamese-American naturalization applicants.

Question #${questionId} (Category: ${category}):
"${questionEn}"

Correct answers: ${correctAnswers.map(a => `"${a}"`).join(', ')}

Generate exactly ${DISTRACTORS_PER_QUESTION} WRONG answer choices (distractors) that:
1. Are plausible but clearly incorrect
2. Are in the same format/style as the correct answers
3. Do NOT overlap with any correct answer
4. Are mutually exclusive with correct answers of related civics questions (e.g. don't use "Democracy" as a distractor since it overlaps with other questions)
5. Are educational (help learners understand what is NOT correct)

Respond with JSON only, no explanation:
[
  {"en": "English distractor 1", "vi": "Vietnamese translation 1"},
  ...
]`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return JSON.parse(text)
}

async function main() {
  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en, category')
    .order('id')

  if (!questions) throw new Error('No questions found — run seed-questions.ts first')

  const rows: string[] = ['question_id,question_en,distractor_en,distractor_vi,approved']

  for (const q of questions) {
    if (SKIP_IDS.has(q.id)) {
      process.stdout.write(`\rSkipping Q${q.id} (handled separately)`)
      continue
    }

    const { data: answers } = await supabase
      .from('n400_answers')
      .select('answer_en')
      .eq('question_id', q.id)
      .eq('is_correct', true)

    const correctAnswers = (answers ?? []).map(a => a.answer_en)

    try {
      const distractors = await generateDistractors(q.id, q.question_en, correctAnswers, q.category)
      for (const d of distractors) {
        const enEscaped = `"${d.en.replace(/"/g, '""')}"`
        const viEscaped = `"${d.vi.replace(/"/g, '""')}"`
        const qEscaped = `"${q.question_en.replace(/"/g, '""')}"`
        rows.push(`${q.id},${qEscaped},${enEscaped},${viEscaped},`)
      }
      process.stdout.write(`\rGenerated Q${q.id}/128`)
    } catch (e) {
      console.error(`\nFailed Q${q.id}:`, e)
      rows.push(`${q.id},"${q.question_en}","ERROR","ERROR",`)
    }

    await new Promise(r => setTimeout(r, 1000))  // 1 req/sec
  }

  const outPath = resolve(__dirname, 'distractors-review.csv')
  writeFileSync(outPath, rows.join('\n'), 'utf-8')
  console.log(`\nSaved to ${outPath}`)
  console.log('Review the CSV, fill in the "approved" column with "yes" for each row to keep, then run import-distractors.ts')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run generator**

```bash
cd apps/website
ANTHROPIC_API_KEY=<key> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/generate-distractors.ts
```

Expected: `Saved to .../distractors-review.csv` with 127 × 5 = 635 rows (Q29 skipped).

- [ ] **Step 4: User reviews CSV**

Open `scripts/n400/distractors-review.csv` in Excel/Google Sheets. For each row:
- If distractor is good → type `yes` in the `approved` column
- If distractor needs editing → edit `distractor_en` and `distractor_vi`, then type `yes`
- If distractor is bad → leave `approved` blank (will be skipped)

**Goal:** every non-Q29 question should have at least 5 approved distractors.

- [ ] **Step 5: Commit generator script**

```bash
git add apps/website/scripts/n400/generate-distractors.ts
git commit -m "feat(n400): add distractor generator script (≥5 per question, Q29 excluded)"
```

- [ ] **Step 6: Seed Q29 distractor pool**

Q29 ("Name your U.S. Representative") cannot have a fixed correct answer — that's resolved per-user from `n400_representatives`. The 4-option UI still needs 3 distractors. Seed a curated pool of plausible "Member of Congress" placeholders that are NEVER actually anyone's rep AND won't collide with any state senator/governor name in `n400_state_data`.

Run in Supabase SQL Editor:
```sql
-- Q29 distractor pool: 5 fictional "Representative" names with the right format.
-- Quiz engine picks 3 at random; the correct answer is injected from n400_representatives at runtime.
INSERT INTO public.n400_answers (question_id, answer_en, answer_vi, is_correct, display_order)
VALUES
  (29, 'Representative John Hartwell',  'Hạ nghị sĩ John Hartwell',  false, 100),
  (29, 'Representative Maria Delgado',  'Hạ nghị sĩ Maria Delgado',  false, 101),
  (29, 'Representative David Kim',      'Hạ nghị sĩ David Kim',      false, 102),
  (29, 'Representative Susan Whitmore', 'Hạ nghị sĩ Susan Whitmore', false, 103),
  (29, 'Representative Robert Chen',    'Hạ nghị sĩ Robert Chen',    false, 104)
ON CONFLICT DO NOTHING;
```

Verify:
```sql
SELECT COUNT(*) FROM n400_answers WHERE question_id = 29;        -- expect 5
SELECT COUNT(*) FROM n400_answers WHERE question_id = 29 AND is_correct = true;  -- expect 0
```

⚠️ **Q29 must have zero `is_correct=true` rows** — the correct answer is always injected from `n400_representatives` at quiz time. If the seed pipeline accidentally inserts one (e.g. from the markdown), delete it.

- [ ] **Step 7: Commit Q29 pool**

```bash
git commit --allow-empty -m "db(n400): seed Q29 (Representative) distractor pool"
```

---

## Task 6: Import approved distractors into DB

**Files:**
- Create: `apps/website/scripts/n400/import-distractors.ts`

- [ ] **Step 1: Create import script**

Create `apps/website/scripts/n400/import-distractors.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CsvRow {
  question_id: number
  distractor_en: string
  distractor_vi: string
  approved: string
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  // skip header
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cols: string[] = []
    let inQuote = false
    let cur = ''
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; continue }
      cur += ch
    }
    cols.push(cur)
    return {
      question_id: parseInt(cols[0], 10),
      distractor_en: cols[2],
      distractor_vi: cols[3],
      approved: cols[4]?.trim().toLowerCase(),
    }
  })
}

async function main() {
  const csvPath = resolve(__dirname, 'distractors-approved.csv')
  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))
  const approved = rows.filter(r => r.approved === 'yes')
  console.log(`Importing ${approved.length} approved distractors...`)

  let count = 0
  for (const row of approved) {
    const { error } = await supabase.from('n400_answers').insert({
      question_id: row.question_id,
      answer_en: row.distractor_en,
      answer_vi: row.distractor_vi,
      is_correct: false,
      display_order: 100 + count,
    })
    if (error) throw new Error(`Q${row.question_id}: ${error.message}`)
    count++
    process.stdout.write(`\rImported ${count}/${approved.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Copy approved CSV**

```bash
cp apps/website/scripts/n400/distractors-review.csv apps/website/scripts/n400/distractors-approved.csv
```

(Edit `distractors-approved.csv` to only keep rows with `approved=yes`)

- [ ] **Step 3: Run import**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/import-distractors.ts
```

Expected: `Imported 384/384` (or however many approved).

- [ ] **Step 4: Commit**

```bash
git add apps/website/scripts/n400/import-distractors.ts
git commit -m "feat(n400): add distractor import script"
```

---

## Task 7: Seed 50-state data migration

**Files:**
- Create: `apps/website/supabase/migrations/n400_02_state_data.sql`

- [ ] **Step 1: Create state data migration**

Create `apps/website/supabase/migrations/n400_02_state_data.sql`:

```sql
-- 50 US States: governor, capital, senators (as of 2025)
INSERT INTO public.n400_state_data (state_code, state_name_en, state_name_vi, governor_name, capital_city, senator_1, senator_2) VALUES
('AL','Alabama','Alabama','Kay Ivey','Montgomery','Tommy Tuberville','Katie Britt'),
('AK','Alaska','Alaska','Mike Dunleavy','Juneau','Lisa Murkowski','Dan Sullivan'),
('AZ','Arizona','Arizona','Katie Hobbs','Phoenix','Mark Kelly','Ruben Gallego'),
('AR','Arkansas','Arkansas','Sarah Huckabee Sanders','Little Rock','John Boozman','Tom Cotton'),
('CA','California','California','Gavin Newsom','Sacramento','Alex Padilla','Adam Schiff'),
('CO','Colorado','Colorado','Jared Polis','Denver','Michael Bennet','John Hickenlooper'),
('CT','Connecticut','Connecticut','Ned Lamont','Hartford','Chris Murphy','Richard Blumenthal'),
('DE','Delaware','Delaware','Matt Meyer','Dover','Lisa Blunt Rochester','Chris Coons'),
('FL','Florida','Florida','Ron DeSantis','Tallahassee','Marco Rubio','Rick Scott'),
('GA','Georgia','Georgia','Brian Kemp','Atlanta','Jon Ossoff','Raphael Warnock'),
('HI','Hawaii','Hawaii','Josh Green','Honolulu','Brian Schatz','Mazie Hirono'),
('ID','Idaho','Idaho','Brad Little','Boise','Mike Crapo','Jim Risch'),
('IL','Illinois','Illinois','JB Pritzker','Springfield','Dick Durbin','Tammy Duckworth'),
('IN','Indiana','Indiana','Mike Braun','Indianapolis','Todd Young','Jim Banks'),
('IA','Iowa','Iowa','Kim Reynolds','Des Moines','Chuck Grassley','Joni Ernst'),
('KS','Kansas','Kansas','Laura Kelly','Topeka','Jerry Moran','Roger Marshall'),
('KY','Kentucky','Kentucky','Andy Beshear','Frankfort','Mitch McConnell','Rand Paul'),
('LA','Louisiana','Louisiana','Jeff Landry','Baton Rouge','Bill Cassidy','John Kennedy'),
('ME','Maine','Maine','Janet Mills','Augusta','Susan Collins','Angus King'),
('MD','Maryland','Maryland','Wes Moore','Annapolis','Ben Cardin','Chris Van Hollen'),
('MA','Massachusetts','Massachusetts','Maura Healey','Boston','Elizabeth Warren','Ed Markey'),
('MI','Michigan','Michigan','Gretchen Whitmer','Lansing','Debbie Stabenow','Gary Peters'),
('MN','Minnesota','Minnesota','Tim Walz','Saint Paul','Amy Klobuchar','Tina Smith'),
('MS','Mississippi','Mississippi','Tate Reeves','Jackson','Roger Wicker','Cindy Hyde-Smith'),
('MO','Missouri','Missouri','Mike Kehoe','Jefferson City','Josh Hawley','Eric Schmitt'),
('MT','Montana','Montana','Greg Gianforte','Helena','Steve Daines','Jon Tester'),
('NE','Nebraska','Nebraska','Jim Pillen','Lincoln','Deb Fischer','Pete Ricketts'),
('NV','Nevada','Nevada','Joe Lombardo','Carson City','Catherine Cortez Masto','Jacky Rosen'),
('NH','New Hampshire','New Hampshire','Kelly Ayotte','Concord','Jeanne Shaheen','Maggie Hassan'),
('NJ','New Jersey','New Jersey','Phil Murphy','Trenton','Bob Menendez','Cory Booker'),
('NM','New Mexico','New Mexico','Michelle Lujan Grisham','Santa Fe','Martin Heinrich','Ben Ray Luján'),
('NY','New York','New York','Kathy Hochul','Albany','Chuck Schumer','Kirsten Gillibrand'),
('NC','North Carolina','North Carolina','Josh Stein','Raleigh','Thom Tillis','Ted Budd'),
('ND','North Dakota','North Dakota','Kelly Armstrong','Bismarck','John Hoeven','Kevin Cramer'),
('OH','Ohio','Ohio','Mike DeWine','Columbus','Sherrod Brown','JD Vance'),
('OK','Oklahoma','Oklahoma','Kevin Stitt','Oklahoma City','James Lankford','Markwayne Mullin'),
('OR','Oregon','Oregon','Tina Kotek','Salem','Ron Wyden','Jeff Merkley'),
('PA','Pennsylvania','Pennsylvania','Josh Shapiro','Harrisburg','Bob Casey','John Fetterman'),
('RI','Rhode Island','Rhode Island','Dan McKee','Providence','Jack Reed','Sheldon Whitehouse'),
('SC','South Carolina','South Carolina','Henry McMaster','Columbia','Lindsey Graham','Tim Scott'),
('SD','South Dakota','South Dakota','Kristi Noem','Pierre','John Thune','Mike Rounds'),
('TN','Tennessee','Tennessee','Bill Lee','Nashville','Marsha Blackburn','Bill Hagerty'),
('TX','Texas','Texas','Greg Abbott','Austin','John Cornyn','Ted Cruz'),
('UT','Utah','Utah','Spencer Cox','Salt Lake City','Mike Lee','John Curtis'),
('VT','Vermont','Vermont','Phil Scott','Montpelier','Bernie Sanders','Peter Welch'),
('VA','Virginia','Virginia','Glenn Youngkin','Richmond','Mark Warner','Tim Kaine'),
('WA','Washington','Washington','Bob Ferguson','Olympia','Patty Murray','Maria Cantwell'),
('WV','West Virginia','West Virginia','Patrick Morrisey','Charleston','Joe Manchin','Shelley Moore Capito'),
('WI','Wisconsin','Wisconsin','Tony Evers','Madison','Tammy Baldwin','Ron Johnson'),
('WY','Wyoming','Wyoming','Mark Gordon','Cheyenne','John Barrasso','Cynthia Lummis'),
-- 6 territories: governor recorded for Q61; no senators (Q23) or capital recordings (Q62) in v1.
('AS','American Samoa','Samoa thuộc Mỹ','Lemanu Peleti Mauga',NULL,NULL,NULL),
('DC','District of Columbia','Washington, D.C.','Muriel Bowser',NULL,NULL,NULL),
('GU','Guam','Guam','Lou Leon Guerrero',NULL,NULL,NULL),
('MP','Northern Mariana Islands','Quần đảo Bắc Mariana','Arnold Palacios',NULL,NULL,NULL),
('PR','Puerto Rico','Puerto Rico','Jenniffer González-Colón',NULL,NULL,NULL),
('VI','Virgin Islands','Quần đảo Virgin Mỹ','Albert Bryan',NULL,NULL,NULL)
ON CONFLICT (state_code) DO UPDATE SET
  governor_name = EXCLUDED.governor_name,
  senator_1 = EXCLUDED.senator_1,
  senator_2 = EXCLUDED.senator_2;
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Verify:
```sql
SELECT COUNT(*) FROM n400_state_data;  -- expect 56 (50 states + 6 territories)
SELECT * FROM n400_state_data WHERE state_code = 'TX';
-- expect: Greg Abbott, Austin, John Cornyn, Ted Cruz
SELECT state_code, governor_name FROM n400_state_data WHERE senator_1 IS NULL;
-- expect 6 territory rows (AS, DC, GU, MP, PR, VI) with governor populated
```

- [ ] **Step 3: Seed location_answers for Q23, Q61, Q62 from state_data**

Run in Supabase SQL Editor:
```sql
-- Q23: "Name one of your state's two U.S. Senators." — store TWO rows per state.
-- USCIS accepts EITHER senator as a correct answer; combined "X and Y" string would be wrong.
-- Skip territories (DC, AS, GU, MP, PR, VI) — no voting senators.
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 23, state_code, senator_1, senator_1 FROM public.n400_state_data
WHERE senator_1 IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET
  answer_vi = EXCLUDED.answer_vi;

INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 23, state_code, senator_2, senator_2 FROM public.n400_state_data
WHERE senator_2 IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET
  answer_vi = EXCLUDED.answer_vi;

-- Q61: What is the name of the Governor of your state?
-- All 56 jurisdictions have a governor (50 states + 6 territories).
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 61, state_code, governor_name, governor_name
FROM public.n400_state_data
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET
  answer_vi = EXCLUDED.answer_vi;

-- Q62: What is the capital of your state?
-- Skip territories — capital not part of v1 audio scope.
INSERT INTO public.n400_location_answers (question_id, state_code, answer_en, answer_vi)
SELECT 62, state_code, capital_city, capital_city
FROM public.n400_state_data
WHERE capital_city IS NOT NULL
ON CONFLICT (question_id, state_code, answer_en) DO UPDATE SET
  answer_vi = EXCLUDED.answer_vi;
```

Verify:
```sql
SELECT COUNT(*) FROM n400_location_answers;  -- expect 206 (100 senators + 56 governors + 50 capitals)
SELECT question_id, COUNT(*) FROM n400_location_answers GROUP BY question_id ORDER BY question_id;
-- expect: 23 → 100, 61 → 56, 62 → 50
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_02_state_data.sql
git commit -m "db(n400): seed 50 states + 6 territories and location answers for Q23, Q61, Q62"
```

---

## Task 8: Seed congressional representatives (Q29)

**Files:**
- Create: `apps/website/scripts/n400/seed-reps.ts`
- Create: `apps/website/scripts/n400/reps-2025.csv` (source data)

- [ ] **Step 1: Download reps CSV from congress.gov**

Go to https://www.congress.gov/members and export or manually compile a CSV with columns:
`state_code,district_number,rep_name`

Save as `apps/website/scripts/n400/reps-2025.csv`. Format:
```
state_code,district_number,rep_name
AL,1,Barry Moore
AL,2,Barry Moore
AL,3,Mike Rogers
...
TX,7,Lucy McBath
TX,9,Al Green
...
AS,0,Aumua Amata Coleman Radewagen
DC,0,Eleanor Holmes Norton
GU,0,James Moylan
MP,0,Kimberlyn King-Hinds
PR,0,Pablo José Hernández
VI,0,Stacey Plaskett
```

Note: At-large districts (states with 1 rep) and the 6 non-voting territorial delegates (DC, AS, GU, MP, PR, VI) all use `district_number = 0`.

- [ ] **Step 2: Create seed script**

Create `apps/website/scripts/n400/seed-reps.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseCsv(content: string): { state_code: string; district_number: number; rep_name: string }[] {
  return content.trim().split('\n').slice(1).map(line => {
    const [state_code, district_number, ...nameParts] = line.split(',')
    return { state_code: state_code.trim(), district_number: parseInt(district_number, 10), rep_name: nameParts.join(',').trim() }
  })
}

async function main() {
  const csvPath = resolve(__dirname, 'reps-2025.csv')
  const reps = parseCsv(readFileSync(csvPath, 'utf-8'))
  console.log(`Seeding ${reps.length} representatives...`)

  const { error } = await supabase.from('n400_representatives').upsert(reps, { onConflict: 'state_code,district_number' })
  if (error) throw new Error(error.message)

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run seed**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/seed-reps.ts
```

Expected: `Seeding 441 representatives... Done.` (435 voting House members + 6 non-voting territorial delegates)

- [ ] **Step 4: Verify**

```sql
SELECT COUNT(*) FROM n400_representatives;  -- expect 441 (435 House + 6 territorial delegates)
SELECT * FROM n400_representatives WHERE state_code = 'TX' ORDER BY district_number LIMIT 5;
SELECT state_code, rep_name FROM n400_representatives WHERE district_number = 0 ORDER BY state_code;
-- expect 6 territory delegates + any single-rep state at-large entries
```

- [ ] **Step 5: Commit**

```bash
git add apps/website/scripts/n400/seed-reps.ts apps/website/scripts/n400/reps-2025.csv
git commit -m "db(n400): seed 441 representatives (435 House + 6 territorial delegates) for Q29"
```

---

## Task 9: Verify seed completeness

**Files:**
- Create: `apps/website/scripts/n400/verify-seed.ts`

- [ ] **Step 1: Create verify script**

Create `apps/website/scripts/n400/verify-seed.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const norm = (s: string) => s.trim().toLowerCase()

async function main() {
  let errors = 0
  const fail = (msg: string) => { console.error(`❌ ${msg}`); errors++ }

  // Check 128 questions exist
  const { count: qCount } = await supabase.from('n400_questions').select('*', { count: 'exact', head: true })
  if (qCount !== 128) fail(`Expected 128 questions, got ${qCount}`)
  else console.log('✅ 128 questions')

  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, is_location_based')
    .order('id')

  for (const q of questions ?? []) {
    const { data: ans } = await supabase
      .from('n400_answers')
      .select('answer_en, is_correct')
      .eq('question_id', q.id)

    const rows = ans ?? []
    const correct = rows.filter(a => a.is_correct)
    const distractors = rows.filter(a => !a.is_correct)

    // Q29 special case: zero correct rows in n400_answers (correct comes from n400_representatives)
    if (q.id === 29) {
      if (correct.length !== 0) fail(`Q29 must have 0 correct answers in n400_answers (got ${correct.length})`)
      if (distractors.length < 5) fail(`Q29 needs ≥5 distractors (got ${distractors.length})`)
    } else {
      if (correct.length < 1) fail(`Q${q.id}: no correct answer`)
      if (distractors.length < 5) fail(`Q${q.id}: only ${distractors.length} distractors (need ≥5)`)
    }

    // Distinct: no distractor text equals any correct text (case-insensitive)
    const correctNorm = new Set(correct.map(a => norm(a.answer_en)))
    for (const d of distractors) {
      if (correctNorm.has(norm(d.answer_en))) fail(`Q${q.id}: distractor "${d.answer_en}" duplicates a correct answer`)
    }

    // No duplicate distractor texts
    const seen = new Set<string>()
    for (const d of distractors) {
      const k = norm(d.answer_en)
      if (seen.has(k)) fail(`Q${q.id}: duplicate distractor "${d.answer_en}"`)
      seen.add(k)
    }
  }
  console.log('✅ Per-question answer integrity (correct ≥1, distractors ≥5, no overlap, no dups)')

  // Check 56 jurisdictions (50 states + 6 territories)
  const { count: stateCount } = await supabase.from('n400_state_data').select('*', { count: 'exact', head: true })
  if (stateCount !== 56) fail(`Expected 56 state_data rows (50 states + 6 territories), got ${stateCount}`)
  else console.log('✅ 56 jurisdictions (50 states + 6 territories)')

  // Check location answers — Q23: 100 (50×2 senators, territories skipped), Q61: 56 (all jurisdictions), Q62: 50 (states only) → total 206
  const { data: locByQ } = await supabase
    .from('n400_location_answers')
    .select('question_id, state_code')

  const expected: Record<number, number> = { 23: 100, 61: 56, 62: 50 }
  const actual: Record<number, Set<string>> = { 23: new Set(), 61: new Set(), 62: new Set() }
  for (const r of locByQ ?? []) {
    if (!actual[r.question_id]) continue
    actual[r.question_id].add(`${r.state_code}-${(r as any).id ?? Math.random()}`)
  }
  for (const [qId, total] of Object.entries(expected)) {
    const { count } = await supabase
      .from('n400_location_answers')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', Number(qId))
    if (count !== total) fail(`Q${qId} location_answers: expected ${total}, got ${count}`)
  }

  // Per-jurisdiction coverage:
  //   Q23 senators: 2 rows for the 50 states, 0 for territories
  //   Q61 governor: 1 row for every jurisdiction (56)
  //   Q62 capital:  1 row for the 50 states, 0 for territories
  const TERRITORIES = new Set(['AS', 'DC', 'GU', 'MP', 'PR', 'VI'])
  const { data: states } = await supabase.from('n400_state_data').select('state_code')
  for (const s of states ?? []) {
    const isTerritory = TERRITORIES.has(s.state_code)
    const expectedPerState: Record<number, number> = {
      23: isTerritory ? 0 : 2,
      61: 1,
      62: isTerritory ? 0 : 1,
    }
    for (const [qId, perState] of Object.entries(expectedPerState)) {
      const { count } = await supabase
        .from('n400_location_answers')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', Number(qId))
        .eq('state_code', s.state_code)
      if (count !== perState) fail(`State ${s.state_code} Q${qId}: expected ${perState} row(s), got ${count}`)
    }
  }
  console.log('✅ Location answer coverage (Q23 × 2 senators × 50 states, Q61 × 56 jurisdictions, Q62 × 50 states)')

  // Check reps
  const { count: repCount } = await supabase.from('n400_representatives').select('*', { count: 'exact', head: true })
  if (!repCount || repCount < 435) fail(`Expected ~441 reps (435 House + 6 territorial delegates), got ${repCount}`)
  else console.log(`✅ ${repCount} representatives`)

  if (errors > 0) { console.error(`\n${errors} error(s) found. Fix before proceeding to Phase 2.`); process.exit(1) }
  else console.log('\n✅ All checks passed. Phase 1 complete.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run verify**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/verify-seed.ts
```

Expected output:
```
✅ 128 questions
✅ Per-question answer integrity (correct ≥1, distractors ≥5, no overlap, no dups)
✅ 56 jurisdictions (50 states + 6 territories)
✅ Location answer coverage (Q23 × 2 senators × 50 states, Q61 × 56 jurisdictions, Q62 × 50 states)
✅ 441 representatives
✅ All checks passed. Phase 1 complete.
```

- [ ] **Step 3: Commit**

```bash
git add apps/website/scripts/n400/verify-seed.ts
git commit -m "feat(n400): add seed verification script"
```

---

## Phase 1 Complete ✅

All DB tables created, RLS applied, 128 questions seeded with correct answers and distractors, 56-jurisdiction state_data seeded (50 states + 6 territories), 441 reps seeded (435 House + 6 territorial delegates), verification passing.

**Next:** Proceed to [Phase 2 — Audio Pipeline](2026-05-13-n400app-phase-2-audio-pipeline.md).

