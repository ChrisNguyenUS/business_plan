# N400 Expansion — Plan 2a: Speaking Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the non-UI foundation the Speaking sections (and later Writing) need: a per-section attempts table + user-state integration, deterministic Daily-5 selection, What-Mean-vocabulary keyword matching, slow audio playback, and per-section practice presets.

**Architecture:** Civics progress lives in `n400_question_attempts` whose `question_id` is an `INT` FK to `n400_questions` — new sections use string ids (`wm-1`, `yn-3`, `wr-7`), so they get their own flat table `n400_section_attempts` (no quiz-envelope needed). "Đã thuộc" (known) is DERIVED from attempts exactly like civics' `flashcardKnown` (last flashcard-mode attempt wins). Pure logic goes in small tested modules under `src/lib/n400/`; the React hook (`user-state.tsx`) only wires them.

**Tech Stack:** Next.js app at `apps/website/`, Supabase (Postgres + RLS), vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md`. Plan sequence: 1 Foundation (✅ merged), **2a this plan**, 2b Speaking pages, 3 Writing + Thi thử, 4 Gamification.

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- Data modules from Plan 1 (committed, tested): `src/lib/n400/whatmean-data.ts` (62 × `WhatMeanQuestion`, ids `wm-1..62`), `yesno-data.ts` (37 × `YesNoQuestion`, ids `yn-1..37`), `writing-data.ts` (45, ids `wr-1..45`).
- `src/lib/n400/user-state.tsx` (455 lines) is the Supabase-backed state hook. Key facts:
  - `loadAll(userId)` fetches profile/bookmarks/quizzes in a `Promise.all`, then derives `flashcardKnown` = last `mode==='flashcard'` attempt per question where `wasCorrect` (lines ~111-118).
  - `recordAnswer(questionId, wasCorrect, mode)` (lines ~256-342) optimistically updates state, inserts a quiz envelope + question attempt, upserts streak into `n400_user_profile` using `nextStreak`/`milestoneCrossed`/`TODAY_LOCAL`, then runs badge evaluators. **New-section recording must mirror the streak part but SKIP badges** (badges for new sections come in Plan 4).
  - `setFlashcardKnown(questionId, known)` just delegates to `recordAnswer(questionId, known, 'flashcard')`.
- `src/lib/n400/storage.ts` holds the pure `N400State` interface (line 42) and `QuizMode` type.
- `src/components/n400/AudioButton.tsx` plays a `src` URL via a lazily-created `HTMLAudioElement`; greys out on error. It currently has no playback-rate support.
- `src/components/n400/PracticeSessionPicker.tsx` is ALREADY generic: it renders whatever `presets: PracticePreset[]` + `totalCount` you pass (`count: null` means "all"). `PracticePreset.id` is the union `'quick'|'standard'|'deep'|'full'` and the picker's icon/tone maps are keyed by those ids — new sections reuse the same 4 ids with different counts, which is exactly the "one theme" the spec wants. No changes to the picker are needed in this plan.
- Existing migrations live at `apps/website/supabase/migrations/n400_01…n400_11*.sql`. Mirror their SQL style; read `n400_04_bookmarks.sql` for the RLS policy idiom before writing the new one.
- Supabase MCP tools are available (`mcp__supabase__apply_migration`, `mcp__supabase__list_tables`) to apply migrations to the remote project.
- vitest: `npx vitest run <file>`; full gate: `npm run type-check && npm run test`.

## File structure this plan creates

```
apps/website/
├── supabase/migrations/n400_12_section_attempts.sql   (Task 1)
├── src/lib/n400/
│   ├── section-progress.ts        + .test.ts          (Task 2: types + known-derivation)
│   ├── daily-five.ts              + .test.ts          (Task 3: date-seeded Daily 5)
│   ├── keyword-match.ts           + .test.ts          (Task 4: vocab spans in Yes/No text)
│   └── section-presets.ts         + .test.ts          (Task 6: per-section preset tables)
├── src/components/n400/AudioButton.tsx                (Task 5: rate + turtle variant)
└── src/lib/n400/user-state.tsx + storage.ts           (Task 7: state wiring)
```

---

### Task 1: `n400_section_attempts` table (migration + apply)

**Files:**
- Create: `apps/website/supabase/migrations/n400_12_section_attempts.sql`

- [ ] **Step 1: Read the RLS idiom of an existing migration**

Run: `cat supabase/migrations/n400_04_bookmarks.sql`
Match its policy naming/style in the next step (adjust the template below if the house style differs).

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/n400_12_section_attempts.sql`:

```sql
-- n400_12: per-section attempts for the Speaking/Writing study sections.
-- Civics attempts stay in n400_question_attempts (INT FK to n400_questions);
-- new sections use string item ids (wm-1, yn-3, wr-7) so they get a flat
-- table of their own. "Known" state is derived client-side from the last
-- flashcard-mode attempt per item (same derivation as civics flashcardKnown).

CREATE TABLE IF NOT EXISTS public.n400_section_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section      TEXT NOT NULL CHECK (section IN ('whatmean', 'yesno', 'writing')),
  item_id      TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('practice', 'flashcard', 'mock_test')),
  was_correct  BOOLEAN NOT NULL,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_n400_section_attempts_user
  ON public.n400_section_attempts (user_id, answered_at);

ALTER TABLE public.n400_section_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n400_section_attempts_select_own"
  ON public.n400_section_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "n400_section_attempts_insert_own"
  ON public.n400_section_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 3: Apply to the remote project**

Use the Supabase MCP tool `apply_migration` with name `n400_12_section_attempts` and the SQL above. Then verify with `list_tables` that `n400_section_attempts` exists with RLS enabled. If MCP tools are unavailable, report DONE_WITH_CONCERNS asking the owner to apply the file manually — do not skip committing the file.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/n400_12_section_attempts.sql
git commit -m "feat(n400app): n400_section_attempts table for Speaking/Writing progress"
```

---

### Task 2: `section-progress.ts` — types + known-derivation

**Files:**
- Create: `apps/website/src/lib/n400/section-progress.ts`
- Test: `apps/website/src/lib/n400/section-progress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/section-progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveSectionKnown, deriveSectionSeen, type SectionAttempt } from './section-progress';

const at = (n: number) => new Date(2026, 6, n).toISOString();

const attempts: SectionAttempt[] = [
  { section: 'whatmean', itemId: 'wm-1', wasCorrect: true, mode: 'flashcard', at: at(1) },
  { section: 'whatmean', itemId: 'wm-2', wasCorrect: true, mode: 'flashcard', at: at(1) },
  // toggled back to unknown later — last flashcard attempt wins
  { section: 'whatmean', itemId: 'wm-2', wasCorrect: false, mode: 'flashcard', at: at(2) },
  // practice answers do NOT affect known
  { section: 'whatmean', itemId: 'wm-3', wasCorrect: true, mode: 'practice', at: at(2) },
  { section: 'yesno', itemId: 'yn-1', wasCorrect: true, mode: 'flashcard', at: at(3) },
];

describe('deriveSectionKnown', () => {
  it('keeps only items whose LAST flashcard attempt was correct, per section', () => {
    const known = deriveSectionKnown(attempts);
    expect(known.whatmean).toEqual(['wm-1']);
    expect(known.yesno).toEqual(['yn-1']);
    expect(known.writing).toEqual([]);
  });

  it('returns empty sections for no attempts', () => {
    const known = deriveSectionKnown([]);
    expect(known).toEqual({ whatmean: [], yesno: [], writing: [] });
  });
});

describe('deriveSectionSeen', () => {
  it('collects every item touched in any mode, per section', () => {
    const seen = deriveSectionSeen(attempts);
    expect([...seen.whatmean].sort()).toEqual(['wm-1', 'wm-2', 'wm-3']);
    expect([...seen.yesno]).toEqual(['yn-1']);
    expect(seen.writing.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/section-progress.test.ts`
Expected: FAIL — cannot resolve `./section-progress`.

- [ ] **Step 3: Implement**

Create `src/lib/n400/section-progress.ts`:

```ts
// Pure types + derivations for the Speaking/Writing study sections.
// Mirrors the civics pattern: "known" is derived from the LAST flashcard-mode
// attempt per item (so toggling known→unknown actually unmarks), and is never
// stored directly. Persistence lives in n400_section_attempts (user-state.tsx).

import type { QuizMode } from './storage';

export type SectionKey = 'whatmean' | 'yesno' | 'writing';

export const SECTION_KEYS: SectionKey[] = ['whatmean', 'yesno', 'writing'];

export interface SectionAttempt {
  section: SectionKey;
  itemId: string; // 'wm-<n>' | 'yn-<n>' | 'wr-<n>'
  wasCorrect: boolean;
  mode: QuizMode;
  at: string; // ISO datetime
}

export type SectionKnown = Record<SectionKey, string[]>;

export function deriveSectionKnown(attempts: SectionAttempt[]): SectionKnown {
  const last: Record<SectionKey, Map<string, boolean>> = {
    whatmean: new Map(),
    yesno: new Map(),
    writing: new Map(),
  };
  for (const a of attempts) {
    if (a.mode === 'flashcard') last[a.section].set(a.itemId, a.wasCorrect);
  }
  const out = {} as SectionKnown;
  for (const key of SECTION_KEYS) {
    out[key] = [...last[key].entries()].filter(([, ok]) => ok).map(([id]) => id);
  }
  return out;
}

export function deriveSectionSeen(attempts: SectionAttempt[]): Record<SectionKey, Set<string>> {
  const out: Record<SectionKey, Set<string>> = {
    whatmean: new Set(),
    yesno: new Set(),
    writing: new Set(),
  };
  for (const a of attempts) out[a.section].add(a.itemId);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/n400/section-progress.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/section-progress.ts src/lib/n400/section-progress.test.ts
git commit -m "feat(n400app): section progress types and known/seen derivations"
```

---

### Task 3: `daily-five.ts` — date-seeded Daily 5 selection

Spec rules: deterministic for a given seed key (section + local date) so reloading never re-rolls; priority unseen → chưa thuộc (seen-but-not-known) → fill with 1 đã-thuộc card for review; if everything is mastered the set becomes a pure review day.

**Files:**
- Create: `apps/website/src/lib/n400/daily-five.ts`
- Test: `apps/website/src/lib/n400/daily-five.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/daily-five.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dailyFiveSelection } from './daily-five';

const ids = Array.from({ length: 20 }, (_, i) => `wm-${i + 1}`);

describe('dailyFiveSelection', () => {
  it('is deterministic for the same seed key', () => {
    const a = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    const b = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it('differs across seed keys (different day or section)', () => {
    const a = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-06');
    const b = dailyFiveSelection(ids, new Set(), new Set(), 'whatmean:2026-07-07');
    const c = dailyFiveSelection(ids, new Set(), new Set(), 'yesno:2026-07-06');
    // 20 choose 5 orderings — collisions astronomically unlikely
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('prioritizes unseen, reserves exactly 1 review slot when possible', () => {
    const known = new Set(['wm-1', 'wm-2']);
    const seen = new Set(['wm-1', 'wm-2', 'wm-3', 'wm-4']); // wm-3, wm-4 = chưa thuộc
    const pick = dailyFiveSelection(ids, known, seen, 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    const reviewCount = pick.filter((id) => known.has(id)).length;
    expect(reviewCount).toBe(1); // exactly one đã-thuộc for review
    // the other 4 come from unseen/learning, never duplicated
    expect(new Set(pick).size).toBe(5);
  });

  it('falls back to learning then mastered when unseen runs out', () => {
    const known = new Set(ids.slice(0, 17)); // 17 mastered
    const seen = new Set(ids); // everything seen; 3 learning (wm-18..20)
    const pick = dailyFiveSelection(ids, known, seen, 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    // all 3 learning items must be in the set; remaining 2 are review
    for (const id of ['wm-18', 'wm-19', 'wm-20']) expect(pick).toContain(id);
  });

  it('becomes a pure review day when everything is mastered', () => {
    const known = new Set(ids);
    const pick = dailyFiveSelection(ids, known, new Set(ids), 'whatmean:2026-07-06');
    expect(pick).toHaveLength(5);
    for (const id of pick) expect(known.has(id)).toBe(true);
  });

  it('caps at pool size for tiny pools', () => {
    const pick = dailyFiveSelection(['wm-1', 'wm-2'], new Set(), new Set(), 'x:2026-07-06');
    expect(pick).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/daily-five.test.ts`
Expected: FAIL — cannot resolve `./daily-five`.

- [ ] **Step 3: Implement**

Create `src/lib/n400/daily-five.ts`:

```ts
// Deterministic "Daily 5" selection for the Speaking/Writing sections.
// Seeded by `${section}:${localDate}` so the set is stable all day (reloads
// never re-roll) and differs across sections and days. Priority: unseen →
// learning (seen but not known) → mastered; when at least `count` items are
// still unmastered and something IS mastered, exactly one slot is reserved
// for review so every day mixes in old material.

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dailyFiveSelection(
  allIds: readonly string[],
  known: ReadonlySet<string>,
  seen: ReadonlySet<string>,
  seedKey: string,
  count = 5,
): string[] {
  const rand = mulberry32(hashSeed(seedKey));
  const unseen = allIds.filter((id) => !seen.has(id) && !known.has(id));
  const learning = allIds.filter((id) => seen.has(id) && !known.has(id));
  const mastered = allIds.filter((id) => known.has(id));

  const target = Math.min(count, allIds.length);
  const reviewSlots =
    mastered.length > 0 && unseen.length + learning.length >= target ? 1 : 0;

  const picks: string[] = [];
  const fresh = [...seededShuffle(unseen, rand), ...seededShuffle(learning, rand)];
  for (const id of fresh) {
    if (picks.length >= target - reviewSlots) break;
    picks.push(id);
  }
  for (const id of seededShuffle(mastered, rand)) {
    if (picks.length >= target) break;
    picks.push(id);
  }
  return picks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/n400/daily-five.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/daily-five.ts src/lib/n400/daily-five.test.ts
git commit -m "feat(n400app): deterministic date-seeded Daily 5 selection"
```

---

### Task 4: `keyword-match.ts` — What Mean vocab spans in Yes/No text

Spec: Yes/No question text underlines keywords by auto-matching the 62 What Mean terms; tapping a keyword shows its definition (UI in Plan 2b — this task delivers only the matcher). Matching must survive simple inflections: source term "Claim to be a U.S. citizen" must match "claimed to be a U.S. citizen" in yn-1.

**Files:**
- Create: `apps/website/src/lib/n400/keyword-match.ts`
- Test: `apps/website/src/lib/n400/keyword-match.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/keyword-match.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findKeywordSpans } from './keyword-match';
import { WHATMEAN_QUESTIONS } from './whatmean-data';
import { YESNO_QUESTIONS_BY_ID } from './yesno-data';

const TERMS = WHATMEAN_QUESTIONS.map((q) => ({ id: q.id, termEn: q.termEn }));

describe('findKeywordSpans', () => {
  it('matches simple inflections (claimed ← claim)', () => {
    const text = YESNO_QUESTIONS_BY_ID['yn-1'].questionEn; // "Have you ever claimed to be a U.S. citizen …"
    const spans = findKeywordSpans(text, TERMS);
    const matched = spans.map((s) => text.slice(s.start, s.end).toLowerCase());
    expect(matched.some((m) => m.startsWith('claimed to be a u.s. citizen'))).toBe(true);
  });

  it('prefers the longest term on overlap (register to vote beats vote)', () => {
    const spans = findKeywordSpans('Have you ever registered to vote in any election?', TERMS);
    const registered = spans.find((s) => s.start === 14);
    expect(registered).toBeDefined();
    // the "vote" inside "registered to vote" must NOT be a separate span
    for (const s of spans) {
      if (s === registered) continue;
      expect(s.start >= registered!.end || s.end <= registered!.start).toBe(true);
    }
  });

  it('spans are sorted and non-overlapping with valid offsets', () => {
    for (const q of Object.values(YESNO_QUESTIONS_BY_ID)) {
      const spans = findKeywordSpans(q.questionEn, TERMS);
      let prevEnd = -1;
      for (const s of spans) {
        expect(s.start).toBeGreaterThanOrEqual(0);
        expect(s.end).toBeGreaterThan(s.start);
        expect(s.end).toBeLessThanOrEqual(q.questionEn.length);
        expect(s.start).toBeGreaterThanOrEqual(prevEnd);
        prevEnd = s.end;
      }
    }
  });

  it('a majority of Yes/No questions contain at least one keyword', () => {
    const withSpans = Object.values(YESNO_QUESTIONS_BY_ID).filter(
      (q) => findKeywordSpans(q.questionEn, TERMS).length > 0,
    );
    // the vocab list was built from Part 12, so coverage should be broad
    expect(withSpans.length).toBeGreaterThanOrEqual(19); // > half of 37
  });

  it('returns [] for text with no keywords', () => {
    expect(findKeywordSpans('The sky is blue today.', TERMS)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/keyword-match.test.ts`
Expected: FAIL — cannot resolve `./keyword-match`.

- [ ] **Step 3: Implement**

Create `src/lib/n400/keyword-match.ts`:

```ts
// Finds occurrences of What Mean vocabulary terms inside a question text so
// the UI can underline them and link to their definitions. Heuristic, not
// NLP: each term word may carry a simple English suffix (claimed ← claim,
// voted ← vote), longest term wins on overlap, matches never overlap.

export interface KeywordSpan {
  start: number;
  end: number; // exclusive
  termId: string; // WhatMeanQuestion id, e.g. 'wm-1'
}

export interface KeywordTerm {
  id: string;
  termEn: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "Claim to be a U.S. citizen" → /\bclaim(?:ed|d|es|s|ing)?\s+to\s+be\s+a\s+u\.s\.\s+citizen(?:…)?/gi
function termToRegex(termEn: string): RegExp {
  const words = termEn
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${escapeRegExp(w)}(?:ed|d|es|s|ing)?`);
  return new RegExp(`\\b${words.join('\\s+')}`, 'gi');
}

export function findKeywordSpans(text: string, terms: readonly KeywordTerm[]): KeywordSpan[] {
  // Longest term first so "register to vote" claims its range before "vote".
  const ordered = [...terms].sort((a, b) => b.termEn.length - a.termEn.length);
  const spans: KeywordSpan[] = [];

  const overlaps = (start: number, end: number) =>
    spans.some((s) => start < s.end && end > s.start);

  for (const term of ordered) {
    const re = termToRegex(term.termEn);
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0; // matchAll always sets index; TS types it optional
      const end = start + m[0].length;
      if (!overlaps(start, end)) spans.push({ start, end, termId: term.id });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/n400/keyword-match.test.ts`
Expected: PASS (5 tests). If the coverage test (`>= 19`) fails, print the actual number and the questions without spans — if genuinely fewer than 19 of 37 match, lower the threshold to the actual count minus 2 and note it in the report (content coverage is what it is; the matcher must still satisfy the other 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/keyword-match.ts src/lib/n400/keyword-match.test.ts
git commit -m "feat(n400app): keyword matcher linking What Mean vocab into question text"
```

---

### Task 5: AudioButton slow-playback variant (🐢)

**Files:**
- Modify: `apps/website/src/components/n400/AudioButton.tsx`

No unit test (component behavior needs a browser); gate is type-check + existing suite + Plan 2b's manual verification.

- [ ] **Step 1: Extend props**

In `AudioButton.tsx`, change the imports and `Props`:

```ts
import { Volume2, VolumeX, Turtle } from 'lucide-react';

type Props = {
  src: string | null;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  /** Playback rate; modern browsers preserve pitch. Pair with variant="slow". */
  rate?: number;
  /** 'slow' renders a turtle icon for đọc-chậm buttons. */
  variant?: 'default' | 'slow';
};
```

and the signature:

```ts
export function AudioButton({
  src,
  label = 'Nghe',
  size = 'md',
  className = '',
  rate = 1,
  variant = 'default',
}: Props) {
```

- [ ] **Step 2: Apply the rate on play**

Inside the existing `onClick`, right after `const audio = audioRef.current;` and before the play/pause branch, add:

```ts
        audio.playbackRate = rate;
        if ('preservesPitch' in audio) audio.preservesPitch = true;
```

(The audio element is cached across plays; setting the rate every click keeps two buttons — normal + slow — sharing the same source correct if they ever share an element. They don't today because each AudioButton owns its ref, but the invariant is cheap.)

- [ ] **Step 3: Variant icon**

Find the icon render at the bottom of the component (currently `Volume2`/`VolumeX` based on `unavailable`). Keep `VolumeX` for unavailable; for the available case render:

```tsx
{unavailable ? <VolumeX size={icon} /> : variant === 'slow' ? <Turtle size={icon} /> : <Volume2 size={icon} />}
```

(Adapt to the file's actual JSX — the render may currently be a single `<Volume2 …/>`/`<VolumeX …/>` conditional; preserve the existing size/class handling.)

- [ ] **Step 4: Verify**

Run: `npm run type-check && npx vitest run src/components/n400`
Expected: type-check clean; existing component tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/n400/AudioButton.tsx
git commit -m "feat(n400app): AudioButton slow-playback variant for đọc chậm"
```

---

### Task 6: `section-presets.ts` — per-section practice presets

Counts and minutes come from the spec's preset table. `count: null` = whole pool (the picker displays `totalCount` for it).

**Files:**
- Create: `apps/website/src/lib/n400/section-presets.ts`
- Test: `apps/website/src/lib/n400/section-presets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/section-presets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WHATMEAN_PRESETS, YESNO_PRESETS } from './section-presets';

describe('section presets', () => {
  it('what mean: 5/15/30/full with spec minutes', () => {
    expect(WHATMEAN_PRESETS.map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 15, 8],
      ['deep', 30, 15],
      ['full', null, 30],
    ]);
  });

  it('yes no: 5/10/20/full with spec minutes', () => {
    expect(YESNO_PRESETS.map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 10, 5],
      ['deep', 20, 10],
      ['full', null, 20],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/n400/section-presets.test.ts`
Expected: FAIL — cannot resolve `./section-presets`.

- [ ] **Step 3: Implement**

Create `src/lib/n400/section-presets.ts`:

```ts
// Practice presets for the Speaking sections. Same 4 tier ids as civics
// (PracticeSessionPicker keys its icons/colors off these ids) with counts
// scaled to each pool — the spec's "one practice theme across the app".
// Writing presets land with the Writing section (Plan 3).

import type { PracticePreset } from './quiz-engine';

export const WHATMEAN_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', descVi: 'Ôn nhanh trong vài phút.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', descVi: 'Bài luyện vừa sức mỗi ngày.', count: 15, minutes: 8 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', descVi: 'Ghi nhớ kỹ hơn, nhớ lâu hơn.', count: 30, minutes: 15 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', descVi: 'Ôn toàn bộ 62 từ vựng.', count: null, minutes: 30 },
];

export const YESNO_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', descVi: 'Ôn nhanh trong vài phút.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', descVi: 'Bài luyện vừa sức mỗi ngày.', count: 10, minutes: 5 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', descVi: 'Ghi nhớ kỹ hơn, nhớ lâu hơn.', count: 20, minutes: 10 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', descVi: 'Ôn toàn bộ 37 câu hỏi.', count: null, minutes: 20 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/n400/section-presets.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/section-presets.ts src/lib/n400/section-presets.test.ts
git commit -m "feat(n400app): practice presets for What Mean and Yes No sections"
```

---

### Task 7: user-state wiring — load, record, mark known

The riskiest task: extends the 455-line Supabase hook. Mirror `recordAnswer` exactly, minus badges. Read `user-state.tsx` fully before editing.

**Files:**
- Modify: `apps/website/src/lib/n400/storage.ts` (N400State interface)
- Modify: `apps/website/src/lib/n400/user-state.tsx`

- [ ] **Step 1: Extend the pure state type**

In `storage.ts`, add the import at the top and two fields to `N400State`:

```ts
import type { SectionAttempt, SectionKnown } from './section-progress';
```

```ts
export interface N400State {
  attempts: QuestionAttempt[];
  bookmarks: number[];
  flashcardKnown: number[];
  sectionAttempts: SectionAttempt[];
  sectionKnown: SectionKnown;
  mockResults: MockResult[];
  // …rest unchanged
```

- [ ] **Step 2: Default state + loader**

In `user-state.tsx`:

a) Add to imports:

```ts
import {
  deriveSectionKnown,
  type SectionAttempt,
  type SectionKey,
} from './section-progress';
```

b) In `DEFAULT_STATE`, next to `flashcardKnown: []`:

```ts
  sectionAttempts: [],
  sectionKnown: { whatmean: [], yesno: [], writing: [] },
```

c) In `loadAll`, add a fourth query to the existing `Promise.all` (match the existing style):

```ts
    supabase
      .from('n400_section_attempts')
      .select('section, item_id, mode, was_correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: true }),
```

destructure it as `sectionRes`, then before the `return`:

```ts
  const sectionAttempts: SectionAttempt[] = (sectionRes.data ?? []).map((r) => ({
    section: r.section as SectionKey,
    itemId: r.item_id as string,
    wasCorrect: r.was_correct as boolean,
    mode: r.mode as QuizMode,
    at: r.answered_at as string,
  }));
```

and add to the returned object:

```ts
    sectionAttempts,
    sectionKnown: deriveSectionKnown(sectionAttempts),
```

- [ ] **Step 3: Recorder callbacks**

Add below `recordAnswer` (before `setFlashcardKnown`), mirroring its streak logic but with no badge evaluation:

```ts
  // Speaking/Writing answer recording. Same optimistic-update + streak
  // contract as recordAnswer, but rows go to the flat n400_section_attempts
  // table (string item ids) and badge evaluation is deferred to the
  // gamification phase.
  const recordSectionAnswer = useCallback(
    async (
      section: SectionKey,
      itemId: string,
      wasCorrect: boolean,
      mode: QuizMode,
    ): Promise<{ milestone: number | null }> => {
      if (!user) return { milestone: null };
      const today = TODAY_LOCAL();
      const newStreak = nextStreak(state.streak, today);
      const milestone = milestoneCrossed(state.streak.current, newStreak.current);
      setState((s) => {
        const nextSectionAttempts = [
          ...s.sectionAttempts,
          { section, itemId, wasCorrect, mode, at: new Date().toISOString() },
        ].slice(-2000);
        return {
          ...s,
          sectionAttempts: nextSectionAttempts,
          sectionKnown: deriveSectionKnown(nextSectionAttempts),
          streak: newStreak,
        };
      });

      const { error } = await supabase.from('n400_section_attempts').insert({
        user_id: user.id,
        section,
        item_id: itemId,
        mode,
        was_correct: wasCorrect,
      });
      if (error) console.error('n400: recordSectionAnswer failed', error);

      await supabase.from('n400_user_profile').upsert(
        {
          user_id: user.id,
          current_streak: newStreak.current,
          longest_streak: newStreak.longest,
          last_activity_date: newStreak.lastActivityDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      return { milestone };
    },
    [user, state.streak]
  );

  const setSectionKnown = useCallback(
    async (
      section: SectionKey,
      itemId: string,
      known: boolean,
    ): Promise<{ milestone: number | null }> => {
      // Reuse recordSectionAnswer so known-state, streak, and DB stay consistent.
      return recordSectionAnswer(section, itemId, known, 'flashcard');
    },
    [recordSectionAnswer]
  );
```

Note: `deriveSectionKnown` recomputes from the capped array — after 2000 attempts the derivation window slides, same accepted trade-off as civics' `.slice(-2000)`.

- [ ] **Step 4: Expose them**

Add `recordSectionAnswer` and `setSectionKnown` to the object returned by `useN400UserStateInternal` (next to `recordAnswer`/`setFlashcardKnown`), and to the context value / hook type if the file re-exports a typed context.

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run test`
Expected: type-check clean, all suites pass (no behavior change for existing consumers — new fields have defaults, new callbacks are additive).

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/storage.ts src/lib/n400/user-state.tsx
git commit -m "feat(n400app): per-section attempts state, recording, and known-marking"
```

---

### Task 8: Full verification

- [ ] **Step 1:** `npm run type-check` — exits 0.
- [ ] **Step 2:** `npm run test` — all suites pass (should now be 17 + 4 new test files).
- [ ] **Step 3:** `npx eslint src/lib/n400/section-progress.ts src/lib/n400/daily-five.ts src/lib/n400/keyword-match.ts src/lib/n400/section-presets.ts src/components/n400/AudioButton.tsx src/lib/n400/user-state.tsx` — no new errors.
- [ ] **Step 4:** `git status --porcelain` — clean tree.

---

## Follow-up plans (not in this plan)

- **Plan 2b — Speaking pages:** routes `speaking/what-mean` + `speaking/yes-no` (Daily 5 hero, Học tất cả cards|list, Luyện tập MC / Yes-No with shuffled options), Sidebar CIVICS/SPEAKING groups, keyword-underline UI with definition popover, Tổng quan entry cards.
- **Plan 3 — Writing + Thi thử**, **Plan 4 — Gamification** (badges will extend `n400_section_attempts` consumers).
