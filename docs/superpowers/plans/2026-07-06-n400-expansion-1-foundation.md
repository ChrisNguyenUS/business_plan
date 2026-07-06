# N400 Expansion — Plan 1: Foundation (Audio Re-point + Data Pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-point civics audio to the reorganized `public/n400-audio/` folder layout and generate typed data modules for the three new content sets (What Mean 62, Yes No 37, Writing 45), so later plans can build UI on top.

**Architecture:** Follows the existing offline build-script pattern (`scripts/n400-build-questions.mjs` → committed `src/lib/n400/questions-data.ts`): one `.mjs` parser per content set, fail-loud validation, generated data-only TS modules. Audio URL helpers live in `src/lib/n400/quiz-engine.ts` next to the existing ones. Data-invariant vitest tests assert counts, shapes, and that every referenced audio file exists on disk.

**Tech Stack:** Next.js app at `apps/website/`, vitest (`npm run test`), plain Node ESM build scripts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md` (phase 1). This is plan 1 of 4 (2: Speaking sections, 3: Writing + Thi thử, 4: Daily Goals/Tiến độ/Badges).

**Working directory for all commands:** `apps/website/` (repo root is 3 levels up from `scripts/`).

---

## Context an engineer needs

- Audio folders were reorganized by the owner. New layout under `apps/website/public/n400-audio/`:
  - `civic_question/q001.mp3 … q128.mp3` (128 files) — was `question/`
  - `civic_answer/a001.mp3 …` (124 files; some questions have no answer audio, `AudioButton` greys out on 404) — was `answer/`
  - `What_mean_questions/question/1.mp3 … 62.mp3` and `What_mean_questions/answer/1.mp3 … 62.mp3`
  - `Yes_no_question/sound/1.mp3 … 37.mp3`
  - `Writing_questions/1.mp3 … 45.mp3`
  - `State/…` (unchanged)
- Old code still points at `/n400-audio/question/` and `/n400-audio/answer/` (`src/lib/n400/quiz-engine.ts:9,15`) — **civics audio is currently broken in the app**. The Supabase storage bucket named `n400-audio` (admin upload) is a different thing; do NOT touch `src/app/[locale]/admin/n400/[questionId]/actions.ts`.
- Content source files (all verified present):
  - `docs/learning_type/what_mean_questions/N400_what_mean_en.md` — lines like
    `5. Nonresident | Can you define nonresident? : Someone who does not live in the U.S.`
    (format: `num. termEn | questionEn : definitionEn`)
  - `docs/learning_type/what_mean_questions/N400_what_mean_vi.md` — lines like
    `5. Nonresident | Can you define nonresident? : Người không cư trú | Bạn có thể định nghĩa người không cư trú không? : Là người không sinh sống tại Mỹ.`
    (format: `num. termEn | questionEn : termVi | questionVi : definitionVi`)
  - `docs/learning_type/what_mean_questions/multiple_choice_distractions` — blocks like

    ```
    ### 2. Register to vote
    *   A. To cast a ballot on election day.
    *   **B. Sign up to choose a leader.** (Correct)
    *   C. To get a permanent driver's license.
    *   D. To apply for federal employment.
    ```
  - `docs/learning_type/yes_no_questions/en.md` — blocks like

    ```
    1. **Have you ever claimed to be a U.S. citizen (in writing or any other way)?**
       - **Answer:** No
    ```
  - `docs/learning_type/yes_no_questions/vi.md` — lines like `1. **Bạn đã bao giờ tự nhận mình là công dân Hoa Kỳ …?**` (no answers)
  - `docs/learning_type/writing_questions/N400_writing_en.md` — topic headers `## 1. Chủ đề: Tổng thống & Lịch sử (Presidents & History)` then numbered EN sentences `1. Adams was the second president of the United States.` (numbering continuous 1–45 across topics)
  - `docs/learning_type/writing_questions/N400_writing_vi.md` — same structure, VI sentences, same numbering.

---

### Task 1: Commit the content reorganization

The owner moved audio folders and added new docs; git currently shows hundreds of deletions under the old `public/n400-audio/{question,answer}/` plus untracked new folders/files. Lock this in as one content commit before touching code.

**Files:**
- Add/remove: `apps/website/public/n400-audio/**` (moves), `docs/learning_type/**` (new content)

- [ ] **Step 1: Inspect what changed**

Run: `cd "/Users/anhnguyen/Obsidian/Business planning" && git status --porcelain | head -30`
Expected: ` D apps/website/public/n400-audio/answer/a001.mp3` style deletions and `??` entries for new audio folders and `docs/learning_type/`.

- [ ] **Step 2: Stage exactly the content areas**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add -A apps/website/public/n400-audio docs/learning_type
git status --porcelain | grep -v '^[AMDR]' | head
```

Expected: second command prints nothing content-related (nothing unstaged under those two paths).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(n400app): reorganize n400-audio folders and add Speaking/Writing content sources"
```

---

### Task 2: Re-point civics audio URLs + service-worker cache bump

**Files:**
- Modify: `apps/website/src/lib/n400/quiz-engine.ts:8-16`
- Modify: `apps/website/public/sw-n400.js:25`
- Test: `apps/website/src/lib/n400/quiz-engine.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/website/src/lib/n400/quiz-engine.test.ts` (add `questionAudioUrl, answerAudioUrl` to the existing import from `./quiz-engine`, or add a new import line):

```ts
import { questionAudioUrl, answerAudioUrl } from './quiz-engine';

describe('civics audio urls (reorganized folder layout)', () => {
  it('builds question audio under civic_question/', () => {
    expect(questionAudioUrl(7)).toBe('/n400-audio/civic_question/q007.mp3');
    expect(questionAudioUrl(128)).toBe('/n400-audio/civic_question/q128.mp3');
  });

  it('builds answer audio under civic_answer/', () => {
    expect(answerAudioUrl(1)).toBe('/n400-audio/civic_answer/a001.mp3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/anhnguyen/Obsidian/Business planning/apps/website" && npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: FAIL — received `/n400-audio/question/q007.mp3`.

- [ ] **Step 3: Update the two URL builders**

In `apps/website/src/lib/n400/quiz-engine.ts` replace the two functions:

```ts
export function questionAudioUrl(id: number): string {
  return `/n400-audio/civic_question/q${String(id).padStart(3, '0')}.mp3`;
}

export function answerAudioUrl(id: number): string | null {
  // Not every question has answer audio (124 of 128 files exist).
  // The frontend tries the URL; missing files fall back gracefully.
  return `/n400-audio/civic_answer/a${String(id).padStart(3, '0')}.mp3`;
}
```

- [ ] **Step 4: Bump the service-worker cache version**

In `apps/website/public/sw-n400.js` change:

```js
const CACHE_NAME = 'n400-audio-v2';
```

(old cached URLs from the pre-reorg layout must be invalidated; the activate handler already drops caches whose name differs from `CACHE_NAME`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: PASS (all tests in file).

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/quiz-engine.ts src/lib/n400/quiz-engine.test.ts public/sw-n400.js
git commit -m "fix(n400app): re-point civics audio to civic_question/civic_answer folders"
```

---

### Task 3: Audio URL helpers for the three new content sets

**Files:**
- Modify: `apps/website/src/lib/n400/quiz-engine.ts` (audio-paths block, after `answerAudioUrl`)
- Test: `apps/website/src/lib/n400/quiz-engine.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `quiz-engine.test.ts` (extend the same import):

```ts
import {
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
  writingAudioUrl,
} from './quiz-engine';

describe('new section audio urls', () => {
  it('what mean question + answer', () => {
    expect(whatMeanQuestionAudioUrl(5)).toBe('/n400-audio/What_mean_questions/question/5.mp3');
    expect(whatMeanAnswerAudioUrl(62)).toBe('/n400-audio/What_mean_questions/answer/62.mp3');
  });

  it('yes/no', () => {
    expect(yesNoAudioUrl(37)).toBe('/n400-audio/Yes_no_question/sound/37.mp3');
  });

  it('writing', () => {
    expect(writingAudioUrl(45)).toBe('/n400-audio/Writing_questions/45.mp3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: FAIL — `whatMeanQuestionAudioUrl` is not exported.

- [ ] **Step 3: Implement the helpers**

Add to `quiz-engine.ts` directly below `answerAudioUrl` (inside the "Audio paths" block; new-set files are named by bare number, no zero padding):

```ts
export function whatMeanQuestionAudioUrl(num: number): string {
  return `/n400-audio/What_mean_questions/question/${num}.mp3`;
}

export function whatMeanAnswerAudioUrl(num: number): string {
  return `/n400-audio/What_mean_questions/answer/${num}.mp3`;
}

export function yesNoAudioUrl(num: number): string {
  return `/n400-audio/Yes_no_question/sound/${num}.mp3`;
}

export function writingAudioUrl(num: number): string {
  return `/n400-audio/Writing_questions/${num}.mp3`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/n400/quiz-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/quiz-engine.ts src/lib/n400/quiz-engine.test.ts
git commit -m "feat(n400app): audio url helpers for What Mean, Yes No, Writing sets"
```

---

### Task 4: What Mean build script + generated data module

**Files:**
- Create: `apps/website/scripts/n400-build-whatmean.mjs`
- Create (generated): `apps/website/src/lib/n400/whatmean-data.ts`
- Test: `apps/website/src/lib/n400/whatmean-data.test.ts`

- [ ] **Step 1: Write the failing data-invariant test**

Create `apps/website/src/lib/n400/whatmean-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WHATMEAN_QUESTIONS } from './whatmean-data';

// vitest runs with cwd = apps/website
const PUB = resolve(process.cwd(), 'public');

describe('whatmean-data', () => {
  it('has 62 questions with sequential namespaced ids', () => {
    expect(WHATMEAN_QUESTIONS).toHaveLength(62);
    WHATMEAN_QUESTIONS.forEach((q, i) => {
      expect(q.num).toBe(i + 1);
      expect(q.id).toBe(`wm-${i + 1}`);
    });
  });

  it('every record is fully bilingual', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(q.termEn.length, q.id).toBeGreaterThan(0);
      expect(q.termVi.length, q.id).toBeGreaterThan(0);
      expect(q.questionEn.length, q.id).toBeGreaterThan(0);
      expect(q.questionVi.length, q.id).toBeGreaterThan(0);
      expect(q.definitionEn.length, q.id).toBeGreaterThan(0);
      expect(q.definitionVi.length, q.id).toBeGreaterThan(0);
    }
  });

  it('every record has exactly 3 distractors, none equal to the correct definition', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(q.distractorsEn, q.id).toHaveLength(3);
      const all = new Set([q.definitionEn, ...q.distractorsEn]);
      expect(all.size, `${q.id} has duplicate options`).toBe(4);
    }
  });

  it('every record has question and answer audio on disk', () => {
    for (const q of WHATMEAN_QUESTIONS) {
      expect(
        existsSync(resolve(PUB, `n400-audio/What_mean_questions/question/${q.num}.mp3`)),
        `${q.id} question audio`,
      ).toBe(true);
      expect(
        existsSync(resolve(PUB, `n400-audio/What_mean_questions/answer/${q.num}.mp3`)),
        `${q.id} answer audio`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/whatmean-data.test.ts`
Expected: FAIL — cannot resolve `./whatmean-data`.

- [ ] **Step 3: Write the build script**

Create `apps/website/scripts/n400-build-whatmean.mjs`:

```js
#!/usr/bin/env node
// Parses docs/learning_type/what_mean_questions/* into a typed TS module.
// Runs offline; output committed to src/lib/n400/whatmean-data.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const DIR = resolve(ROOT, 'docs/learning_type/what_mean_questions');
const EN_PATH = resolve(DIR, 'N400_what_mean_en.md');
const VI_PATH = resolve(DIR, 'N400_what_mean_vi.md');
const MC_PATH = resolve(DIR, 'multiple_choice_distractions');
const OUT_PATH = resolve(__dirname, '../src/lib/n400/whatmean-data.ts');

const EXPECTED = 62;

// "5. Nonresident | Can you define nonresident? : Someone who does not live in the U.S."
function parseEn(md) {
  const map = new Map();
  for (const raw of md.split('\n')) {
    const m = raw.trim().match(/^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+:\s+(.+)$/);
    if (!m) continue;
    map.set(parseInt(m[1], 10), {
      termEn: m[2].trim(),
      questionEn: m[3].trim(),
      definitionEn: m[4].trim(),
    });
  }
  return map;
}

// "5. Nonresident | Can you define nonresident? : Người không cư trú | Bạn có thể…? : Là người…"
function parseVi(md) {
  const map = new Map();
  for (const raw of md.split('\n')) {
    const m = raw.trim().match(/^(\d+)\.\s+(.+)$/);
    if (!m) continue;
    const parts = m[2].split(' : ');
    if (parts.length < 3) continue; // prose lines
    const viPair = parts[1].split(' | ');
    if (viPair.length !== 2) {
      throw new Error(`VI #${m[1]}: expected "termVi | questionVi", got "${parts[1]}"`);
    }
    map.set(parseInt(m[1], 10), {
      termVi: viPair[0].trim(),
      questionVi: viPair[1].trim(),
      definitionVi: parts.slice(2).join(' : ').trim(),
    });
  }
  return map;
}

// "### 2. Register to vote" then "*   **B. Sign up to choose a leader.** (Correct)" / "*   A. …"
function parseMc(md) {
  const map = new Map();
  let current = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^###\s+(\d+)\./);
    if (h) {
      current = { correct: null, distractors: [] };
      map.set(parseInt(h[1], 10), current);
      continue;
    }
    if (!current) continue;
    const correct = line.match(/^\*\s+\*\*[A-D]\.\s+(.+?)\*\*\s+\(Correct\)$/);
    if (correct) {
      current.correct = correct[1].trim();
      continue;
    }
    const plain = line.match(/^\*\s+([A-D])\.\s+(.+)$/);
    if (plain) current.distractors.push(plain[2].trim());
  }
  return map;
}

const norm = (s) => s.toLowerCase().replace(/\.$/, '').trim();

function main() {
  const en = parseEn(readFileSync(EN_PATH, 'utf-8'));
  const vi = parseVi(readFileSync(VI_PATH, 'utf-8'));
  const mc = parseMc(readFileSync(MC_PATH, 'utf-8'));

  for (const [name, map] of [['EN', en], ['VI', vi], ['MC', mc]]) {
    if (map.size !== EXPECTED) {
      console.error(`${name}: expected ${EXPECTED} entries, got ${map.size}`);
      process.exit(1);
    }
  }

  const records = [];
  for (let num = 1; num <= EXPECTED; num++) {
    const e = en.get(num);
    const v = vi.get(num);
    const m = mc.get(num);
    if (!e) throw new Error(`Missing EN #${num}`);
    if (!v) throw new Error(`Missing VI #${num}`);
    if (!m) throw new Error(`Missing MC #${num}`);
    if (!m.correct) throw new Error(`MC #${num}: no (Correct) option`);
    if (m.distractors.length !== 3) {
      throw new Error(`MC #${num}: expected 3 distractors, got ${m.distractors.length}`);
    }
    if (norm(m.correct) !== norm(e.definitionEn)) {
      throw new Error(
        `MC #${num}: correct option "${m.correct}" != EN definition "${e.definitionEn}"`,
      );
    }
    records.push({ id: `wm-${num}`, num, ...e, ...v, distractorsEn: m.distractors });
  }

  const j = JSON.stringify;
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/n400-build-whatmean.mjs — do not edit by hand.');
  lines.push('// Source: docs/learning_type/what_mean_questions/*');
  lines.push('');
  lines.push('export interface WhatMeanQuestion {');
  lines.push('  id: string; // "wm-<n>", namespaced so state never collides with civics numeric ids');
  lines.push('  num: number; // 1-based; audio file name under What_mean_questions/');
  lines.push('  termEn: string;');
  lines.push('  termVi: string;');
  lines.push('  questionEn: string;');
  lines.push('  questionVi: string;');
  lines.push('  definitionEn: string; // the correct MC option');
  lines.push('  definitionVi: string;');
  lines.push('  distractorsEn: string[]; // exactly 3');
  lines.push('}');
  lines.push('');
  lines.push('export const WHATMEAN_QUESTIONS: WhatMeanQuestion[] = [');
  for (const r of records) {
    lines.push('  {');
    lines.push(`    id: ${j(r.id)},`);
    lines.push(`    num: ${r.num},`);
    lines.push(`    termEn: ${j(r.termEn)},`);
    lines.push(`    termVi: ${j(r.termVi)},`);
    lines.push(`    questionEn: ${j(r.questionEn)},`);
    lines.push(`    questionVi: ${j(r.questionVi)},`);
    lines.push(`    definitionEn: ${j(r.definitionEn)},`);
    lines.push(`    definitionVi: ${j(r.definitionVi)},`);
    lines.push(`    distractorsEn: [${r.distractorsEn.map(j).join(', ')}],`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push('export const WHATMEAN_QUESTIONS_BY_ID: Record<string, WhatMeanQuestion> =');
  lines.push('  Object.fromEntries(WHATMEAN_QUESTIONS.map((q) => [q.id, q]));');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${records.length} What Mean questions to ${OUT_PATH}`);
}

main();
```

- [ ] **Step 4: Run the script**

Run: `node scripts/n400-build-whatmean.mjs`
Expected: `Wrote 62 What Mean questions to …/whatmean-data.ts`. If it exits with a parse/validation error, the content file has an irregular line — report the exact error to the owner instead of hand-editing generated output.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/whatmean-data.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/n400-build-whatmean.mjs src/lib/n400/whatmean-data.ts src/lib/n400/whatmean-data.test.ts
git commit -m "feat(n400app): What Mean data pipeline (62 questions + MC distractors)"
```

---

### Task 5: Yes No build script + generated data module

**Files:**
- Create: `apps/website/scripts/n400-build-yesno.mjs`
- Create (generated): `apps/website/src/lib/n400/yesno-data.ts`
- Test: `apps/website/src/lib/n400/yesno-data.test.ts`

- [ ] **Step 1: Write the failing data-invariant test**

Create `apps/website/src/lib/n400/yesno-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { YESNO_QUESTIONS } from './yesno-data';

const PUB = resolve(process.cwd(), 'public');

describe('yesno-data', () => {
  it('has 37 questions with sequential namespaced ids', () => {
    expect(YESNO_QUESTIONS).toHaveLength(37);
    YESNO_QUESTIONS.forEach((q, i) => {
      expect(q.num).toBe(i + 1);
      expect(q.id).toBe(`yn-${i + 1}`);
    });
  });

  it('every record is bilingual with a standard answer', () => {
    for (const q of YESNO_QUESTIONS) {
      expect(q.questionEn.length, q.id).toBeGreaterThan(0);
      expect(q.questionVi.length, q.id).toBeGreaterThan(0);
      expect(['yes', 'no'], q.id).toContain(q.answer);
    }
  });

  it('every record has audio on disk', () => {
    for (const q of YESNO_QUESTIONS) {
      expect(
        existsSync(resolve(PUB, `n400-audio/Yes_no_question/sound/${q.num}.mp3`)),
        `${q.id} audio`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/yesno-data.test.ts`
Expected: FAIL — cannot resolve `./yesno-data`.

- [ ] **Step 3: Write the build script**

Create `apps/website/scripts/n400-build-yesno.mjs`:

```js
#!/usr/bin/env node
// Parses docs/learning_type/yes_no_questions/{en,vi}.md into a typed TS module.
// Runs offline; output committed to src/lib/n400/yesno-data.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const EN_PATH = resolve(ROOT, 'docs/learning_type/yes_no_questions/en.md');
const VI_PATH = resolve(ROOT, 'docs/learning_type/yes_no_questions/vi.md');
const OUT_PATH = resolve(__dirname, '../src/lib/n400/yesno-data.ts');

const EXPECTED = 37;

// "1. **Have you ever …?**" followed by "   - **Answer:** No"
function parseEn(md) {
  const map = new Map();
  let lastId = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const q = line.match(/^(\d+)\.\s+\*\*(.+)\*\*$/);
    if (q) {
      lastId = parseInt(q[1], 10);
      map.set(lastId, { questionEn: q[2].trim(), answer: null });
      continue;
    }
    const a = line.match(/^-\s+\*\*Answer:\*\*\s+(Yes|No)\b/i);
    if (a && lastId !== null) {
      map.get(lastId).answer = a[1].toLowerCase();
    }
  }
  return map;
}

// "1. **Bạn đã bao giờ …?**"
function parseVi(md) {
  const map = new Map();
  for (const raw of md.split('\n')) {
    const m = raw.trim().match(/^(\d+)\.\s+\*\*(.+)\*\*$/);
    if (m) map.set(parseInt(m[1], 10), m[2].trim());
  }
  return map;
}

function main() {
  const en = parseEn(readFileSync(EN_PATH, 'utf-8'));
  const vi = parseVi(readFileSync(VI_PATH, 'utf-8'));

  if (en.size !== EXPECTED) {
    console.error(`EN: expected ${EXPECTED} questions, got ${en.size}`);
    process.exit(1);
  }
  if (vi.size !== EXPECTED) {
    console.error(`VI: expected ${EXPECTED} questions, got ${vi.size}`);
    process.exit(1);
  }

  const records = [];
  for (let num = 1; num <= EXPECTED; num++) {
    const e = en.get(num);
    const v = vi.get(num);
    if (!e) throw new Error(`Missing EN #${num}`);
    if (!v) throw new Error(`Missing VI #${num}`);
    if (!e.answer) throw new Error(`EN #${num}: missing "**Answer:** Yes/No" line`);
    records.push({ id: `yn-${num}`, num, questionEn: e.questionEn, questionVi: v, answer: e.answer });
  }

  const j = JSON.stringify;
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/n400-build-yesno.mjs — do not edit by hand.');
  lines.push('// Source: docs/learning_type/yes_no_questions/{en,vi}.md');
  lines.push('');
  lines.push('export interface YesNoQuestion {');
  lines.push('  id: string; // "yn-<n>", namespaced so state never collides with civics numeric ids');
  lines.push('  num: number; // 1-based; audio file name under Yes_no_question/sound/');
  lines.push('  questionEn: string;');
  lines.push('  questionVi: string;');
  lines.push("  answer: 'yes' | 'no'; // standard answer for a typical clean record");
  lines.push('}');
  lines.push('');
  lines.push('export const YESNO_QUESTIONS: YesNoQuestion[] = [');
  for (const r of records) {
    lines.push('  {');
    lines.push(`    id: ${j(r.id)},`);
    lines.push(`    num: ${r.num},`);
    lines.push(`    questionEn: ${j(r.questionEn)},`);
    lines.push(`    questionVi: ${j(r.questionVi)},`);
    lines.push(`    answer: ${j(r.answer)},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push('export const YESNO_QUESTIONS_BY_ID: Record<string, YesNoQuestion> =');
  lines.push('  Object.fromEntries(YESNO_QUESTIONS.map((q) => [q.id, q]));');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${records.length} Yes/No questions to ${OUT_PATH}`);
}

main();
```

- [ ] **Step 4: Run the script**

Run: `node scripts/n400-build-yesno.mjs`
Expected: `Wrote 37 Yes/No questions to …/yesno-data.ts`. On validation error, report to owner (content fix, not code fix).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/yesno-data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/n400-build-yesno.mjs src/lib/n400/yesno-data.ts src/lib/n400/yesno-data.test.ts
git commit -m "feat(n400app): Yes/No data pipeline (37 Part 12 questions with standard answers)"
```

---

### Task 6: Writing build script + generated data module

**Files:**
- Create: `apps/website/scripts/n400-build-writing.mjs`
- Create (generated): `apps/website/src/lib/n400/writing-data.ts`
- Test: `apps/website/src/lib/n400/writing-data.test.ts`

- [ ] **Step 1: Write the failing data-invariant test**

Create `apps/website/src/lib/n400/writing-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WRITING_SENTENCES } from './writing-data';

const PUB = resolve(process.cwd(), 'public');

describe('writing-data', () => {
  it('has 45 sentences with sequential namespaced ids', () => {
    expect(WRITING_SENTENCES).toHaveLength(45);
    WRITING_SENTENCES.forEach((s, i) => {
      expect(s.num).toBe(i + 1);
      expect(s.id).toBe(`wr-${i + 1}`);
    });
  });

  it('every record is bilingual with a topic', () => {
    for (const s of WRITING_SENTENCES) {
      expect(s.sentenceEn.length, s.id).toBeGreaterThan(0);
      expect(s.sentenceVi.length, s.id).toBeGreaterThan(0);
      expect(s.topicEn.length, s.id).toBeGreaterThan(0);
      expect(s.topicVi.length, s.id).toBeGreaterThan(0);
    }
  });

  it('every record has audio on disk', () => {
    for (const s of WRITING_SENTENCES) {
      expect(
        existsSync(resolve(PUB, `n400-audio/Writing_questions/${s.num}.mp3`)),
        `${s.id} audio`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/writing-data.test.ts`
Expected: FAIL — cannot resolve `./writing-data`.

- [ ] **Step 3: Write the build script**

Create `apps/website/scripts/n400-build-writing.mjs`:

```js
#!/usr/bin/env node
// Parses docs/learning_type/writing_questions/N400_writing_{en,vi}.md into a typed TS module.
// Runs offline; output committed to src/lib/n400/writing-data.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const EN_PATH = resolve(ROOT, 'docs/learning_type/writing_questions/N400_writing_en.md');
const VI_PATH = resolve(ROOT, 'docs/learning_type/writing_questions/N400_writing_vi.md');
const OUT_PATH = resolve(__dirname, '../src/lib/n400/writing-data.ts');

const EXPECTED = 45;

// Headers: "## 1. Chủ đề: Tổng thống & Lịch sử (Presidents & History)"
// Sentences: "6. Congress has 100 senators." — numbering continuous across topics.
function parseLang(md) {
  const map = new Map();
  let topicVi = '';
  let topicEn = '';
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const t = line.match(/^##\s+\d+\.\s+Chủ đề:\s+(.+?)\s+\((.+)\)$/);
    if (t) {
      topicVi = t[1].trim();
      topicEn = t[2].trim();
      continue;
    }
    const s = line.match(/^(\d+)\.\s+(.+)$/);
    if (s && topicEn) {
      map.set(parseInt(s[1], 10), { sentence: s[2].trim(), topicVi, topicEn });
    }
  }
  return map;
}

function main() {
  const en = parseLang(readFileSync(EN_PATH, 'utf-8'));
  const vi = parseLang(readFileSync(VI_PATH, 'utf-8'));

  if (en.size !== EXPECTED) {
    console.error(`EN: expected ${EXPECTED} sentences, got ${en.size}`);
    process.exit(1);
  }
  if (vi.size !== EXPECTED) {
    console.error(`VI: expected ${EXPECTED} sentences, got ${vi.size}`);
    process.exit(1);
  }

  const records = [];
  for (let num = 1; num <= EXPECTED; num++) {
    const e = en.get(num);
    const v = vi.get(num);
    if (!e) throw new Error(`Missing EN #${num}`);
    if (!v) throw new Error(`Missing VI #${num}`);
    records.push({
      id: `wr-${num}`,
      num,
      topicEn: e.topicEn,
      topicVi: e.topicVi,
      sentenceEn: e.sentence,
      sentenceVi: v.sentence,
    });
  }

  const j = JSON.stringify;
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/n400-build-writing.mjs — do not edit by hand.');
  lines.push('// Source: docs/learning_type/writing_questions/N400_writing_{en,vi}.md');
  lines.push('');
  lines.push('export interface WritingSentence {');
  lines.push('  id: string; // "wr-<n>", namespaced so state never collides with civics numeric ids');
  lines.push('  num: number; // 1-based; audio file name under Writing_questions/');
  lines.push('  topicEn: string;');
  lines.push('  topicVi: string;');
  lines.push('  sentenceEn: string; // canonical dictation sentence');
  lines.push('  sentenceVi: string;');
  lines.push('}');
  lines.push('');
  lines.push('export const WRITING_SENTENCES: WritingSentence[] = [');
  for (const r of records) {
    lines.push('  {');
    lines.push(`    id: ${j(r.id)},`);
    lines.push(`    num: ${r.num},`);
    lines.push(`    topicEn: ${j(r.topicEn)},`);
    lines.push(`    topicVi: ${j(r.topicVi)},`);
    lines.push(`    sentenceEn: ${j(r.sentenceEn)},`);
    lines.push(`    sentenceVi: ${j(r.sentenceVi)},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push('export const WRITING_SENTENCES_BY_ID: Record<string, WritingSentence> =');
  lines.push('  Object.fromEntries(WRITING_SENTENCES.map((s) => [s.id, s]));');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${records.length} Writing sentences to ${OUT_PATH}`);
}

main();
```

- [ ] **Step 4: Run the script**

Run: `node scripts/n400-build-writing.mjs`
Expected: `Wrote 45 Writing sentences to …/writing-data.ts`. On validation error, report to owner.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/writing-data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/n400-build-writing.mjs src/lib/n400/writing-data.ts src/lib/n400/writing-data.test.ts
git commit -m "feat(n400app): Writing data pipeline (45 dictation sentences)"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `cd "/Users/anhnguyen/Obsidian/Business planning/apps/website" && npm run type-check`
Expected: exits 0, no errors.

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: all suites pass, including the 3 new data test files and the extended quiz-engine tests.

- [ ] **Step 3: Verify civics audio in the running app**

Run: `npm run dev`, open `http://localhost:3000/vi/n400app/flashcards`, click the 🔊 button on a card front and back.
Expected: question audio and answer audio both play (they were broken before Task 2). Stop the dev server after.

- [ ] **Step 4: Commit any stragglers and confirm clean tree**

Run: `git status --porcelain`
Expected: empty. If generated files changed during verification, re-run the relevant build script and commit with `chore(n400app): regenerate data modules`.

---

## Follow-up plans (not in this plan)

- **Plan 2 — Speaking sections:** What Mean + Yes No landing pages, shared Daily 5 session, generalized `PracticeSessionPicker`, Luyện tập MC / Yes-No, keyword highlighting, `AudioButton` slow-playback prop, per-section user-state buckets.
- **Plan 3 — Writing + Thi thử:** USCIS grader, dictation flow, Thi thử picker + Viết + Speaking mock tests.
- **Plan 4 — Gamification:** Daily Goals items, Tiến độ stat blocks, 40 new badges per `docs/N400_badge_definitions.md`.
