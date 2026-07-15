# N400app Progress Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the N400app Tiến Độ screen around the three questions it exists to answer — "Khi nào sẵn sàng phỏng vấn?", "Mình yếu ở đâu?", "Mình có tiến bộ không?" — so every skill (not just Civics) is tracked, nothing is duplicated, and the default tab fits one mobile screen.

**Architecture:** Two tabs split by *depth*, not by data type: `/progress` = Tổng quan (glanceable, no scroll) and `/statistic` = Chi tiết (deep dive). All new derivation lives in two pure modules (`readiness.ts`, `activity-heatmap.ts`) with colocated tests; pages stay thin. Zero database migrations — the plan only starts *reading* `n400_section_mock_results`, a table that already exists and is already written to. The redesign deletes more UI than it adds (BadgeGallery duplicate, 5 KPI cards, 4 StatsCards, a duplicate category block).

**Tech Stack:** Next.js (App Router, route group `(app)`), React 19 client components, TypeScript, Tailwind, Supabase JS, **Vitest** (`pnpm test` — this repo does *not* use Jest despite a stale `jest.setup.ts` at the app root).

**Spec:** `docs/superpowers/specs/2026-07-15-n400app-progress-redesign-design.md`

**Working directory for every command:** `apps/website`

---

## Pre-flight: read this before Task 1

**The test suite is already red on `main`.** Baseline as of 2026-07-15:

```
Test Files  2 failed | 33 passed (35)
     Tests  12 failed | 269 passed (281)
```

All 12 failures are in `src/components/n400/navigation-ia.test.ts` and `src/components/n400/mobile-layout.test.ts`. **None of them are your fault and none indicate broken product code.** A past refactor moved every page into the `(app)` route group and moved the app shell from `n400app/layout.tsx` into `n400app/(app)/layout.tsx`, but these two source-reading tests still point at the pre-refactor paths, so `readFileSync` throws `ENOENT`.

Task 1 repairs them. Do Task 1 first so you are building on a green suite — otherwise you cannot tell your regressions apart from the pre-existing noise.

## Spec deviation you must know about (decided, not open)

The spec's §5 table lists the five readiness criteria in the order `civics_known → civics_mock → whatmean → yesno → writing_mock`, but the spec's prose states the ordering rule as **"nền tảng trước, thi thử sau"** (foundations first, mock tests last). Those contradict each other, and the ASCII mockup follows the table.

**This plan implements the prose rule**, because it is the stated *principle* (the table was just an enumeration) and because it matches the dashboard hero's existing pedagogy — `hero-recommendation.ts` only nudges a first mock once civics coverage is ≥80%. Final order:

1. `civics_known` — Thuộc 80% Civics
2. `whatmean_known` — Thuộc 80% What Mean
3. `yesno_known` — Thuộc 80% Yes/No
4. `writing_mock` — Đậu thi thử Viết
5. `civics_mock` — Đậu 2 bài thi thử Civics gần nhất

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/n400/readiness.ts` **(create)** | Pure journey engine: 5 criteria → percent, checklist, next action |
| `src/lib/n400/readiness.test.ts` **(create)** | Unit tests for the above |
| `src/lib/n400/activity-heatmap.ts` **(create)** | Pure heatmap builder, extracted from the statistic page, `now` injectable |
| `src/lib/n400/activity-heatmap.test.ts` **(create)** | Unit tests for the above |
| `src/lib/n400/storage.ts` **(modify)** | Add `SectionMockResult` type; add field to `N400State` |
| `src/lib/n400/user-state.tsx` **(modify)** | Load `n400_section_mock_results`; append optimistically on record |
| `src/components/n400/progress/ReadinessHero.tsx` **(create)** | Ring + "việc tiếp theo" CTA |
| `src/components/n400/progress/SkillsCard.tsx` **(create)** | One card, four skill rows |
| `src/components/n400/progress/ProgressTabs.tsx` **(modify)** | Relabel tabs; `/progress` becomes the primary |
| `src/app/[locale]/n400app/(app)/progress/page.tsx` **(rewrite)** | Tab 1 — Tổng quan |
| `src/app/[locale]/n400app/(app)/statistic/page.tsx` **(rewrite)** | Tab 2 — Chi tiết |
| `src/components/n400/Sidebar.tsx` **(modify)** | Tiến độ entry → `progress` |
| `src/lib/n400/hero-recommendation.ts` **(modify)** | Secondary CTA href `/statistic` → `/progress` |
| `src/components/n400/navigation-ia.test.ts` **(modify)** | Repair stale paths; update progress contracts |
| `src/components/n400/mobile-layout.test.ts` **(modify)** | Repair stale paths; update statistic layout contract |
| `src/components/n400/progress/StatsCard.tsx` **(delete)** | Replaced by `SkillsCard` |

---

### Task 1: Repair the pre-existing red test suite

Both test files read source files by path. Every path is missing the `(app)` route-group segment, and `mobile-layout.test.ts` reads the wrong layout file. Fix paths only — do not touch assertions in this task.

**Files:**
- Modify: `src/components/n400/navigation-ia.test.ts`
- Modify: `src/components/n400/mobile-layout.test.ts`

- [ ] **Step 1: Confirm the baseline failure**

Run: `pnpm test 2>&1 | tail -4`

Expected: `Test Files  2 failed | 33 passed (35)` and `Tests  12 failed | 269 passed (281)`. If your numbers differ, stop and report — someone changed things under you.

- [ ] **Step 2: Fix the route-group paths in `navigation-ia.test.ts`**

Every occurrence of `src/app/[locale]/n400app/` in this file must become `src/app/[locale]/n400app/(app)/`. Run:

```bash
sed -i '' "s|src/app/\[locale\]/n400app/|src/app/[locale]/n400app/(app)/|g" src/components/n400/navigation-ia.test.ts
```

Verify the twelve referenced pages all resolve:

```bash
grep -o "src/app/\[locale\]/n400app/(app)/[a-z0-9/_-]*\.tsx" src/components/n400/navigation-ia.test.ts | sort -u | while read -r f; do [ -f "$f" ] && echo "OK   $f" || echo "MISS $f"; done
```

Expected: twelve `OK` lines, zero `MISS`.

- [ ] **Step 3: Fix the paths in `mobile-layout.test.ts`**

Same substitution:

```bash
sed -i '' "s|src/app/\[locale\]/n400app/|src/app/[locale]/n400app/(app)/|g" src/components/n400/mobile-layout.test.ts
```

This also fixes the `layout.tsx` reference: the app shell (with the `lg:ml-64` sidebar offset the test asserts) lives at `src/app/[locale]/n400app/(app)/layout.tsx`. The root `n400app/layout.tsx` only mounts `N400UserStateProvider` and legitimately has no `lg:ml-64`.

- [ ] **Step 4: Run both files and verify green**

Run: `pnpm test src/components/n400/navigation-ia.test.ts src/components/n400/mobile-layout.test.ts`

Expected: `Test Files  2 passed (2)`, `Tests  19 passed (19)`.

- [ ] **Step 5: Run the whole suite and verify a clean baseline**

Run: `pnpm test 2>&1 | tail -4`

Expected: `Test Files  35 passed (35)`, `Tests  281 passed (281)`. **Do not start Task 2 until this is green.**

- [ ] **Step 6: Commit**

```bash
git add src/components/n400/navigation-ia.test.ts src/components/n400/mobile-layout.test.ts
git commit -m "fix(test): point n400 IA and layout contracts at the (app) route group

These two source-reading suites still used pre-route-group paths, so every
readFileSync threw ENOENT and 12 tests failed on main."
```

---

### Task 2: Read `n400_section_mock_results` into app state

The Writing/Speaking mock results table already exists (migration `n400_13_badges_v2.sql`) and is already written to by three pages, but nothing ever reads it — so the Viết mock a user passed is invisible everywhere. Readiness criterion 5 and the Chi tiết tab both need it. **No migration.**

**Files:**
- Modify: `src/lib/n400/storage.ts`
- Modify: `src/lib/n400/user-state.tsx`

- [ ] **Step 1: Add the `SectionMockResult` type**

In `src/lib/n400/storage.ts`, insert directly after the `MockResult` interface (which ends at the line `}` following `questionResults`):

```ts
/**
 * A Writing or Speaking mock-test result. Civics mocks live in
 * n400_quiz_attempts (mode='mock_test') and surface as MockResult; these two
 * mocks are client-only and n400_section_mock_results is their only record.
 */
export interface SectionMockResult {
  id: string;
  section: 'writing' | 'speaking';
  passed: boolean;
  score: number;
  total: number;
  completedAt: string; // ISO datetime
}
```

- [ ] **Step 2: Add the field to `N400State`**

In the same file, in `interface N400State`, add the field immediately after `mockResults: MockResult[];`:

```ts
  sectionMockResults: SectionMockResult[];
```

- [ ] **Step 3: Type-check to see the expected breakage**

Run: `pnpm type-check`

Expected: FAIL — errors saying `sectionMockResults` is missing in the `DEFAULT_STATE` object literal and in the object returned by `loadAll` in `user-state.tsx`. That is exactly what the next steps fill in.

- [ ] **Step 4: Wire the type through `user-state.tsx`**

In `src/lib/n400/user-state.tsx`:

Add `SectionMockResult` to the type-only import from `./storage`, so the line reads:

```ts
import type { QuizMode, MockResult, SectionMockResult, UserSettings, UserAddress, N400State } from './storage';
```

Re-export it alongside the others:

```ts
export type { QuizMode, MockResult, SectionMockResult, UserSettings, UserAddress, N400State };
```

In `DEFAULT_STATE`, add after `mockResults: [],`:

```ts
  sectionMockResults: [],
```

Add a DB row shape next to the existing `DbQuiz` interface:

```ts
interface DbSectionMock {
  id: string;
  section: string;
  passed: boolean;
  score: number;
  total: number;
  completed_at: string;
}
```

- [ ] **Step 5: Fetch the rows in `loadAll`**

In `loadAll`, extend the destructuring and the `Promise.all` array with a fifth query. The array currently destructures `[profileRes, bookmarksRes, quizzesRes, sectionRes]` — make it:

```ts
  const [profileRes, bookmarksRes, quizzesRes, sectionRes, sectionMockRes] = await Promise.all([
```

and append this as the last element of the array, after the `n400_section_attempts` query:

```ts
    supabase
      .from('n400_section_mock_results')
      .select('id, section, passed, score, total, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(50),
  ]);
```

Note the ordering: descending + `limit(50)` takes the **most recent** 50 (ascending + limit would take the oldest 50 — the wrong end). Step 6 flips them back to chronological order.

- [ ] **Step 6: Map the rows and return them**

Still in `loadAll`, add this right before the `return {` statement:

```ts
  // Fetched newest-first so the limit keeps recent rows; the app wants them
  // chronological, like mockResults.
  const sectionMockResults: SectionMockResult[] = ((sectionMockRes.data ?? []) as DbSectionMock[])
    .map((r) => ({
      id: r.id,
      section: r.section as 'writing' | 'speaking',
      passed: r.passed,
      score: r.score,
      total: r.total,
      completedAt: r.completed_at,
    }))
    .reverse();
```

Then add to the returned object, immediately after `mockResults,`:

```ts
    sectionMockResults,
```

- [ ] **Step 7: Append optimistically when a section mock is recorded**

`recordSectionMockResult` currently inserts to the DB but never touches local state, so a freshly-passed Viết mock would not move the readiness ring until a page reload. In `recordSectionMockResult`, insert this block immediately after the `if (error) console.error('n400: recordSectionMockResult failed', error);` line:

```ts
      if (!error && inserted) {
        const local: SectionMockResult = {
          id: inserted.id as string,
          section,
          passed,
          score,
          total,
          completedAt: new Date().toISOString(),
        };
        setState((s) => ({
          ...s,
          sectionMockResults: [...s.sectionMockResults, local].slice(-50),
        }));
      }
```

- [ ] **Step 8: Type-check and run the suite**

Run: `pnpm type-check && pnpm test 2>&1 | tail -4`

Expected: type-check clean; `Test Files  35 passed (35)`, `Tests  281 passed (281)`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/n400/storage.ts src/lib/n400/user-state.tsx
git commit -m "feat(n400): load writing/speaking mock results into app state

The table has existed and been written to since the badges v2 migration but
was never read back, so passed Viết/Speaking mocks were invisible to the UI."
```

---

### Task 3: The `readiness.ts` engine

The third and final recommendation engine. It must not duplicate the other two: the dashboard hero owns *"what do I do right now"*, the study tip owns *"what do I study first in this module"*, and this owns *"what's left before the interview"*. Harmony is enforced by importing the shared threshold rather than re-declaring one, and by reusing existing deep links rather than inventing routes.

**Files:**
- Create: `src/lib/n400/readiness.ts`
- Create: `src/lib/n400/readiness.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/readiness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveReadiness, type ReadinessSignals } from './readiness';
import type { MockResult, SectionMockResult } from './storage';

function mock(passed: boolean, completedAt: string): MockResult {
  return {
    id: completedAt,
    startedAt: completedAt,
    completedAt,
    score: passed ? 15 : 5,
    total: 20,
    passed,
    questionResults: [],
  };
}

function sectionMock(section: 'writing' | 'speaking', passed: boolean): SectionMockResult {
  return { id: `${section}-${passed}`, section, passed, score: 3, total: 3, completedAt: '2026-07-01T00:00:00Z' };
}

/** Nothing done at all. */
function emptySignals(): ReadinessSignals {
  return {
    civicsKnown: 0,
    civicsTotal: 128,
    whatmeanKnown: 0,
    whatmeanTotal: 62,
    yesnoKnown: 0,
    yesnoTotal: 37,
    mockResults: [],
    sectionMockResults: [],
  };
}

/** Every criterion satisfied. */
function readySignals(): ReadinessSignals {
  return {
    civicsKnown: 128,
    civicsTotal: 128,
    whatmeanKnown: 62,
    whatmeanTotal: 62,
    yesnoKnown: 37,
    yesnoTotal: 37,
    mockResults: [mock(true, '2026-07-01T00:00:00Z'), mock(true, '2026-07-02T00:00:00Z')],
    sectionMockResults: [sectionMock('writing', true)],
  };
}

describe('deriveReadiness', () => {
  it('reports zero for a brand-new learner and points at civics first', () => {
    const r = deriveReadiness(emptySignals());
    expect(r.percent).toBe(0);
    expect(r.metCount).toBe(0);
    expect(r.totalCount).toBe(5);
    expect(r.ready).toBe(false);
    expect(r.next?.id).toBe('civics_known');
  });

  it('reports 100 and no next action once every criterion is met', () => {
    const r = deriveReadiness(readySignals());
    expect(r.percent).toBe(100);
    expect(r.metCount).toBe(5);
    expect(r.ready).toBe(true);
    expect(r.next).toBeNull();
  });

  it('orders criteria foundations-first, mock tests last', () => {
    expect(deriveReadiness(emptySignals()).criteria.map((c) => c.id)).toEqual([
      'civics_known',
      'whatmean_known',
      'yesno_known',
      'writing_mock',
      'civics_mock',
    ]);
  });

  it('treats the 80% threshold as full credit for a known-criterion', () => {
    // 80% of 128 = 102.4, so 103 known clears it.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 103 });
    const civics = r.criteria.find((c) => c.id === 'civics_known')!;
    expect(civics.met).toBe(true);
    expect(civics.progress).toBe(1);
    // One of five criteria fully met → 20%.
    expect(r.percent).toBe(20);
  });

  it('gives partial credit below the threshold, so the ring moves while learning', () => {
    // Half of the 102.4 target.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 51 });
    const civics = r.criteria.find((c) => c.id === 'civics_known')!;
    expect(civics.met).toBe(false);
    expect(civics.progress).toBeCloseTo(0.498, 2);
    expect(r.percent).toBe(10);
  });

  it('never lets a known-criterion exceed full credit', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 128 });
    expect(r.criteria.find((c) => c.id === 'civics_known')!.progress).toBe(1);
  });

  it('requires the two most recent civics mocks to have passed', () => {
    const signals = {
      ...readySignals(),
      mockResults: [mock(true, '2026-07-01T00:00:00Z'), mock(false, '2026-07-02T00:00:00Z')],
    };
    const civicsMock = deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!;
    expect(civicsMock.met).toBe(false);
    expect(civicsMock.progress).toBe(0.5);
  });

  it('ignores older passes when a recent mock failed', () => {
    // Three passes then a fail: the last two are [pass, fail] → not met.
    const signals = {
      ...readySignals(),
      mockResults: [
        mock(true, '2026-07-01T00:00:00Z'),
        mock(true, '2026-07-02T00:00:00Z'),
        mock(true, '2026-07-03T00:00:00Z'),
        mock(false, '2026-07-04T00:00:00Z'),
      ],
    };
    expect(deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!.met).toBe(false);
  });

  it('sorts mocks by completion date rather than trusting array order', () => {
    const signals = {
      ...readySignals(),
      mockResults: [mock(false, '2026-07-09T00:00:00Z'), mock(true, '2026-07-01T00:00:00Z'), mock(true, '2026-07-02T00:00:00Z')],
    };
    // Chronologically the newest is the failure → last two are [pass, fail].
    expect(deriveReadiness(signals).criteria.find((c) => c.id === 'civics_mock')!.met).toBe(false);
  });

  it('treats the writing mock as all-or-nothing and ignores speaking mocks', () => {
    const failed = deriveReadiness({ ...readySignals(), sectionMockResults: [sectionMock('writing', false)] });
    expect(failed.criteria.find((c) => c.id === 'writing_mock')!.progress).toBe(0);
    expect(failed.next?.id).toBe('writing_mock');

    const speakingOnly = deriveReadiness({ ...readySignals(), sectionMockResults: [sectionMock('speaking', true)] });
    expect(speakingOnly.criteria.find((c) => c.id === 'writing_mock')!.met).toBe(false);

    const passed = deriveReadiness({ ...readySignals(), sectionMockResults: [sectionMock('writing', false), sectionMock('writing', true)] });
    expect(passed.criteria.find((c) => c.id === 'writing_mock')!.met).toBe(true);
  });

  it('picks the first unmet criterion in order as the next action', () => {
    // Civics done, What Mean not → What Mean is next even though later ones are also unmet.
    const r = deriveReadiness({ ...emptySignals(), civicsKnown: 128 });
    expect(r.next?.id).toBe('whatmean_known');
  });

  it('gives every criterion a base-relative CTA href', () => {
    for (const c of deriveReadiness(emptySignals()).criteria) {
      expect(c.cta.href.startsWith('/')).toBe(true);
      expect(c.cta.label.length).toBeGreaterThan(0);
    }
  });

  it('guards against an empty question pool instead of dividing by zero', () => {
    const r = deriveReadiness({ ...emptySignals(), civicsTotal: 0, whatmeanTotal: 0, yesnoTotal: 0 });
    expect(Number.isNaN(r.percent)).toBe(false);
    expect(r.criteria.find((c) => c.id === 'civics_known')!.progress).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/n400/readiness.test.ts`

Expected: FAIL — `Failed to resolve import "./readiness"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/n400/readiness.ts`:

```ts
// Journey-level engine for the Tiến độ screen: "which conditions am I still
// missing before I'm ready for the real N-400 interview?"
//
// This is the third of the app's three recommendation engines. They answer
// deliberately different questions and must not drift into each other:
//
//   hero-recommendation.ts  → the MOMENT:  "what do I do right now?"
//   study-modules.ts (tip)  → the SESSION: "what do I study first in here?"
//   readiness.ts (this)     → the JOURNEY: "what's left before the interview?"
//
// Harmony is structural, not a convention: the pass mark is imported from the
// hero engine rather than re-declared, and every CTA reuses a deep link that
// already exists. All hrefs are relative to the n400app base (`/${locale}/n400app`).

import type { MockResult, SectionMockResult } from './storage';
import { FIRST_MOCK_MIN_PERCENT } from './hero-recommendation';

export type ReadinessCriterionId =
  | 'civics_known'
  | 'whatmean_known'
  | 'yesno_known'
  | 'writing_mock'
  | 'civics_mock';

export interface ReadinessCriterion {
  id: ReadinessCriterionId;
  /** Checklist row label, e.g. "Thuộc 80% câu Civics". */
  label: string;
  /** Short progress detail, e.g. "102/128 câu". */
  detail: string;
  met: boolean;
  /** 0–1 progress toward this criterion. Partial credit keeps the ring moving. */
  progress: number;
  cta: { label: string; href: string };
}

export interface Readiness {
  /** 0–100, rounded. Every criterion contributes an equal share. */
  percent: number;
  metCount: number;
  totalCount: number;
  /** Fixed order: foundations first, mock tests last. */
  criteria: ReadinessCriterion[];
  /** First unmet criterion in that order; null once everything is met. */
  next: ReadinessCriterion | null;
  ready: boolean;
}

export interface ReadinessSignals {
  civicsKnown: number;
  civicsTotal: number;
  whatmeanKnown: number;
  whatmeanTotal: number;
  yesnoKnown: number;
  yesnoTotal: number;
  mockResults: readonly MockResult[];
  sectionMockResults: readonly SectionMockResult[];
}

/**
 * Share of a skill's items that must be known. Deliberately the same bar the
 * dashboard hero uses to decide a learner is ready for a first mock — one
 * definition of "biết đủ rồi" across the whole app.
 */
export const KNOWN_THRESHOLD = FIRST_MOCK_MIN_PERCENT / 100;

/** How many of the most recent civics mocks must have passed. */
export const CIVICS_MOCK_PASS_STREAK = 2;

function knownCriterion(
  id: ReadinessCriterionId,
  skillLabel: string,
  known: number,
  total: number,
  ctaLabel: string,
  href: string,
): ReadinessCriterion {
  const target = total * KNOWN_THRESHOLD;
  const progress = target <= 0 ? 0 : Math.min(known / target, 1);
  return {
    id,
    label: `Thuộc ${FIRST_MOCK_MIN_PERCENT}% câu ${skillLabel}`,
    detail: `${known}/${total} câu`,
    met: progress >= 1,
    progress,
    cta: { label: ctaLabel, href },
  };
}

/** Passes among the most recent CIVICS_MOCK_PASS_STREAK mocks, chronologically. */
function recentMockPasses(mockResults: readonly MockResult[]): number {
  return [...mockResults]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .slice(-CIVICS_MOCK_PASS_STREAK)
    .filter((m) => m.passed).length;
}

export function deriveReadiness(s: ReadinessSignals): Readiness {
  const passes = recentMockPasses(s.mockResults);
  const writingPassed = s.sectionMockResults.some((m) => m.section === 'writing' && m.passed);

  const criteria: ReadinessCriterion[] = [
    knownCriterion('civics_known', 'Civics', s.civicsKnown, s.civicsTotal, 'Học Civics', '/flashcards?filter=unknown'),
    knownCriterion('whatmean_known', 'What Mean', s.whatmeanKnown, s.whatmeanTotal, 'Luyện What Mean', '/speaking/what-mean'),
    knownCriterion('yesno_known', 'Yes/No', s.yesnoKnown, s.yesnoTotal, 'Luyện Yes/No', '/speaking/yes-no'),
    {
      id: 'writing_mock',
      label: 'Đậu bài thi thử Viết',
      detail: writingPassed ? 'Đã đậu' : 'Chưa đậu',
      met: writingPassed,
      progress: writingPassed ? 1 : 0,
      cta: { label: 'Thi thử Viết', href: '/mock-test/viet' },
    },
    {
      id: 'civics_mock',
      label: `Đậu ${CIVICS_MOCK_PASS_STREAK} bài thi thử Civics gần nhất`,
      detail: `${passes}/${CIVICS_MOCK_PASS_STREAK} lần đậu`,
      met: passes >= CIVICS_MOCK_PASS_STREAK,
      progress: passes / CIVICS_MOCK_PASS_STREAK,
      cta: { label: 'Thi thử Civics', href: '/mock-test' },
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  return {
    percent: Math.round((criteria.reduce((sum, c) => sum + c.progress, 0) / criteria.length) * 100),
    metCount,
    totalCount: criteria.length,
    criteria,
    next: criteria.find((c) => !c.met) ?? null,
    ready: metCount === criteria.length,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/n400/readiness.test.ts`

Expected: PASS — `Tests  13 passed (13)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/readiness.ts src/lib/n400/readiness.test.ts
git commit -m "feat(n400): add readiness engine for the progress screen

Five interview-readiness criteria with partial credit. Shares the hero
engine's 80% pass mark and reuses existing deep links so the three
recommendation engines cannot drift apart."
```

---

### Task 4: Extract the activity heatmap and make it count every skill

`buildHeatGrid` is pure logic marooned inside the statistic page, calling `new Date()` internally (so it cannot be tested), and it only ever receives civics attempts — a user who studies only Writing sees an empty calendar. Extract it, inject `now`, and let it take any dated attempts.

Behaviour is preserved exactly, including the quirk that `busiestDay` counts **all** attempts ever while the grid only covers the last 35 days.

**Files:**
- Create: `src/lib/n400/activity-heatmap.ts`
- Create: `src/lib/n400/activity-heatmap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/n400/activity-heatmap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildHeatGrid, HEAT_WEEKDAYS } from './activity-heatmap';

// A Wednesday, used as "now" throughout so the grid window is deterministic.
const NOW = new Date(2026, 6, 15, 10, 0, 0);

/** Local-midnight ISO for `daysAgo` before NOW, so no timezone drift. */
function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function at(times: string[]) {
  return times.map((t) => ({ at: t }));
}

describe('buildHeatGrid', () => {
  it('returns a 5x7 grid', () => {
    const { grid } = buildHeatGrid([], NOW);
    expect(grid).toHaveLength(5);
    for (const row of grid) expect(row).toHaveLength(7);
  });

  it('is entirely cold with no activity', () => {
    const { grid, busiestDay, totalDays } = buildHeatGrid([], NOW);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
    expect(busiestDay).toBe('—');
    expect(totalDays).toBe(0);
  });

  it('scales intensity by the number of attempts in a day', () => {
    // Today is the last cell of the last row.
    const cell = (times: string[]) => buildHeatGrid(at(times), NOW).grid[4][6];
    expect(cell([daysAgo(0)])).toBe(1);                              // 1–3
    expect(cell(Array(5).fill(daysAgo(0)))).toBe(2);                 // 4–8
    expect(cell(Array(12).fill(daysAgo(0)))).toBe(3);                // 9–15
    expect(cell(Array(20).fill(daysAgo(0)))).toBe(4);                // 16+
  });

  it('counts distinct active days, not attempts', () => {
    const { totalDays } = buildHeatGrid(at([daysAgo(0), daysAgo(0), daysAgo(3)]), NOW);
    expect(totalDays).toBe(2);
  });

  it('names the most-studied weekday', () => {
    // NOW (2026-07-15) is a Wednesday = T4; daysAgo(7) is also a Wednesday,
    // so T4 scores 2 against T3's 1.
    const { busiestDay } = buildHeatGrid(at([daysAgo(0), daysAgo(7), daysAgo(1)]), NOW);
    expect(busiestDay).toBe('T4');
    expect(HEAT_WEEKDAYS).toContain(busiestDay);
  });

  it('merges attempts from every skill onto one calendar', () => {
    // The whole point of the extraction: civics + section attempts together.
    const civics = at([daysAgo(0)]);
    const sections = at([daysAgo(0), daysAgo(0)]);
    expect(buildHeatGrid([...civics, ...sections], NOW).grid[4][6]).toBe(1); // 3 attempts → level 1
    expect(buildHeatGrid([...civics, ...sections, ...at([daysAgo(0)])], NOW).grid[4][6]).toBe(2); // 4 → level 2
  });

  it('ignores activity older than the 35-day window in the grid', () => {
    const { grid, totalDays } = buildHeatGrid(at([daysAgo(200)]), NOW);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
    // totalDays intentionally counts all history, not just the window.
    expect(totalDays).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/n400/activity-heatmap.test.ts`

Expected: FAIL — `Failed to resolve import "./activity-heatmap"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/n400/activity-heatmap.ts`:

```ts
// Pure builder for the Tiến độ activity calendar. Lifted out of the statistic
// page for two reasons: it was untestable there (it read `new Date()` itself),
// and it only ever saw civics attempts — so a learner who spent a week on
// Writing saw a blank calendar. It now takes any dated attempts, and the page
// merges every skill before calling it.

/** Anything with an ISO timestamp: civics QuestionAttempt or SectionAttempt. */
export interface ActivityDay {
  at: string;
}

export interface HeatGrid {
  /** 5 rows (oldest week first) x 7 columns (Mon..Sun); each cell 0–4. */
  grid: number[][];
  /** Vietnamese label of the most-studied weekday, or '—' with no activity. */
  busiestDay: string;
  /** Distinct days with at least one attempt, across all history. */
  totalDays: number;
}

/** Monday-first, matching the grid's column order. */
export const HEAT_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Tailwind classes per intensity level; index matches the cell value. */
export const HEAT_COLORS = ['bg-teal-50', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];

const WEEKS = 5;

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  if (count <= 15) return 3;
  return 4;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function buildHeatGrid(attempts: readonly ActivityDay[], now: Date): HeatGrid {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Map<string, number>();
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

  for (const a of attempts) {
    const d = new Date(a.at);
    const key = dayKey(d);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    weekdayCount[(d.getDay() + 6) % 7] += 1; // JS Sunday=0 → Monday=0
  }

  const grid: number[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const row: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      row.push(intensity(buckets.get(dayKey(date)) ?? 0));
    }
    grid.push(row);
  }

  // busiestDay deliberately looks at all history, not just the grid window —
  // "which day of the week do you study on" is a habit, not a recent trend.
  let maxIdx = 0;
  for (let i = 1; i < weekdayCount.length; i++) {
    if (weekdayCount[i] > weekdayCount[maxIdx]) maxIdx = i;
  }

  return {
    grid,
    busiestDay: weekdayCount[maxIdx] === 0 ? '—' : HEAT_WEEKDAYS[maxIdx],
    totalDays: buckets.size,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/n400/activity-heatmap.test.ts`

Expected: PASS — `Tests  7 passed (7)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/activity-heatmap.ts src/lib/n400/activity-heatmap.test.ts
git commit -m "feat(n400): extract activity heatmap builder as a tested pure module

Takes any dated attempts and an injectable now, so the calendar can count
every skill instead of civics only."
```

---

### Task 5: The two Tổng quan components

Both follow the compact spacing recipe the hub screens use (cards `!p-4`), because the Tổng quan tab must fit one mobile screen without scrolling. `Card` defaults to `p-6 sm:p-8`, so the override is required — this is the same trick `StatsCard` used with `!p-6`.

**Files:**
- Create: `src/components/n400/progress/ReadinessHero.tsx`
- Create: `src/components/n400/progress/SkillsCard.tsx`

- [ ] **Step 1: Create `ReadinessHero.tsx`**

```tsx
'use client';

// The Tiến độ hero: one number for "am I ready?", one action for "what's next?".
// It deliberately shows only the single most important unmet condition — the
// full checklist lives on the Chi tiết tab. Keep it compact: this card shares
// one mobile screen with the skills card and the chip row.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import type { Readiness } from '@/lib/n400/readiness';

const SIZE = 72;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessHero({ readiness, base }: { readiness: Readiness; base: string }) {
  const { percent, metCount, totalCount, next, ready } = readiness;

  return (
    <Card className="!p-4 sm:!p-6">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              stroke="currentColor"
              className="text-slate-100"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              stroke="currentColor"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
              className={ready ? 'text-emerald-500' : 'text-teal-600'}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums text-teal-900">
            {percent}%
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-base font-bold text-teal-900 sm:text-lg">Sẵn sàng phỏng vấn</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Đạt {metCount}/{totalCount} điều kiện
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {next ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Việc tiếp theo</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{next.label}</p>
            <Link
              href={`${base}${next.cta.href}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              {next.cta.label} <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">
            🎉 Bạn đã đạt đủ {totalCount} điều kiện — sẵn sàng cho buổi phỏng vấn!
          </p>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create `SkillsCard.tsx`**

```tsx
'use client';

// All four interview skills in ONE card — replaces the four separate StatsCards,
// which could not fit a mobile screen together with the hero. Answers "mình yếu
// ở đâu?" at a glance: the weakest skill is the only one flagged.

import Link from 'next/link';
import { Card, ProgressBar } from '@/components/n400/ui';

export interface SkillRow {
  id: string;
  icon: string;
  label: string;
  /** Items the learner knows. */
  known: number;
  total: number;
  /** Absolute href (locale + base already applied). */
  href: string;
  /** Exactly one row should carry this — the weakest skill. */
  weak: boolean;
}

export function SkillsCard({ rows }: { rows: SkillRow[] }) {
  return (
    <Card className="!p-4 sm:!p-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Kỹ năng</h2>
      <div className="mt-2.5 space-y-2.5">
        {rows.map((row) => {
          const percent = row.total === 0 ? 0 : Math.round((row.known / row.total) * 100);
          return (
            <Link
              key={row.id}
              href={row.href}
              className="-mx-2 block rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-lg" aria-hidden="true">
                  {row.icon}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-gray-700">{row.label}</span>
                {row.weak ? (
                  <span className="shrink-0 text-xs" title="Cần luyện thêm">
                    ⚠️
                  </span>
                ) : null}
                <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-gray-500">
                  {row.known}/{row.total}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar
                  progress={percent}
                  heightClass="h-1.5"
                  colorClass={row.weak ? 'bg-orange-400' : 'bg-teal-600'}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`

Expected: clean. (Nothing imports these yet — that is Task 6.)

- [ ] **Step 4: Commit**

```bash
git add src/components/n400/progress/ReadinessHero.tsx src/components/n400/progress/SkillsCard.tsx
git commit -m "feat(n400): add readiness hero and unified skills card"
```

---

### Task 6: Rewrite `/progress` as the Tổng quan tab

Replaces the four StatsCards and the duplicated BadgeGallery with the hero, the single skills card, and a chip row. Badges keep their home on the Tài khoản page; here they are one chip that links there.

**Files:**
- Rewrite: `src/app/[locale]/n400app/(app)/progress/page.tsx`

- [ ] **Step 1: Replace the file wholesale**

```tsx
'use client';

// Tiến độ — tab 1 of 2, "Tổng quan". Answers the three questions the screen
// exists for, at a glance and in one mobile screen with no scrolling:
//   "Khi nào sẵn sàng?" → the readiness hero
//   "Mình yếu ở đâu?"   → the skills card, weakest skill flagged
//   "Tiến bộ không?"    → the chip row (streak, badges, last mock)
// Everything that needs explaining rather than glancing lives on /statistic.

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import type { SectionKey } from '@/lib/n400/section-progress';
import { deriveReadiness } from '@/lib/n400/readiness';
import {
  moduleAccuracy,
  NEEDS_PRACTICE_MIN_ATTEMPTS,
  NEEDS_PRACTICE_MAX_ACCURACY,
} from '@/lib/n400/study-modules';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { ReadinessHero } from '@/components/n400/progress/ReadinessHero';
import { SkillsCard, type SkillRow } from '@/components/n400/progress/SkillsCard';

export default function ProgressPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  // Graded tallies per section, mirroring the study page's derivation.
  const sectionGraded = useMemo(() => {
    const graded: Record<SectionKey, { total: number; correct: number }> = {
      whatmean: { total: 0, correct: 0 },
      yesno: { total: 0, correct: 0 },
      writing: { total: 0, correct: 0 },
    };
    for (const a of state.sectionAttempts) {
      graded[a.section].total += 1;
      if (a.wasCorrect) graded[a.section].correct += 1;
    }
    return graded;
  }, [state.sectionAttempts]);

  const readiness = useMemo(
    () =>
      deriveReadiness({
        civicsKnown: stats.mastered,
        civicsTotal: N400_QUESTIONS.length,
        whatmeanKnown: state.sectionKnown.whatmean.length,
        whatmeanTotal: WHATMEAN_QUESTIONS.length,
        yesnoKnown: state.sectionKnown.yesno.length,
        yesnoTotal: YESNO_QUESTIONS.length,
        mockResults: state.mockResults,
        sectionMockResults: state.sectionMockResults,
      }),
    [stats.mastered, state.sectionKnown, state.mockResults, state.sectionMockResults],
  );

  // The weakest skill: lowest accuracy among those with enough evidence to
  // judge. Same bar the study page uses for its "needs practice" badge, so the
  // two screens never disagree about which skill is weak.
  const weakestId = useMemo(() => {
    // No type annotation here on purpose: the shape changes through the
    // filter→map chain, and inference carries the id literals to the end.
    const candidates = [
      { id: 'civics', gradedAttempts: state.attempts.length, correctAttempts: state.attempts.filter((a) => a.wasCorrect).length },
      { id: 'whatmean', gradedAttempts: sectionGraded.whatmean.total, correctAttempts: sectionGraded.whatmean.correct },
      { id: 'yesno', gradedAttempts: sectionGraded.yesno.total, correctAttempts: sectionGraded.yesno.correct },
      { id: 'writing', gradedAttempts: sectionGraded.writing.total, correctAttempts: sectionGraded.writing.correct },
    ]
      .filter((c) => c.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS)
      .map((c) => ({ id: c.id, accuracy: moduleAccuracy(c) ?? 100 }))
      .filter((c) => c.accuracy < NEEDS_PRACTICE_MAX_ACCURACY);

    if (candidates.length === 0) return null;
    return candidates.reduce((worst, c) => (c.accuracy < worst.accuracy ? c : worst)).id;
  }, [state.attempts, sectionGraded]);

  const skillRows: SkillRow[] = useMemo(
    () => [
      { id: 'civics', icon: '📚', label: 'Civics', known: stats.mastered, total: N400_QUESTIONS.length, href: `${base}/study/civics` },
      { id: 'whatmean', icon: '📖', label: 'What Mean', known: state.sectionKnown.whatmean.length, total: WHATMEAN_QUESTIONS.length, href: `${base}/speaking/what-mean` },
      { id: 'yesno', icon: '🎤', label: 'Yes/No', known: state.sectionKnown.yesno.length, total: YESNO_QUESTIONS.length, href: `${base}/speaking/yes-no` },
      { id: 'writing', icon: '✍️', label: 'Viết', known: state.sectionKnown.writing.length, total: WRITING_SENTENCES.length, href: `${base}/writing` },
    ].map((row) => ({ ...row, weak: row.id === weakestId })),
    [stats.mastered, state.sectionKnown, base, weakestId],
  );

  const lastMock = state.mockResults.length > 0 ? state.mockResults[state.mockResults.length - 1] : null;

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-3 animate-in fade-in duration-300 sm:gap-4">
      <ProgressTabs />

      <ReadinessHero readiness={readiness} base={base} />

      <SkillsCard rows={skillRows} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
          🔥 {state.streak.current} ngày
        </span>
        <Link
          href={`${base}/profile`}
          className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
        >
          🏅 {badges.hydrated ? `${badges.earned.length}/${badges.catalog.length}` : '—'} huy hiệu
        </Link>
        <Link
          href={`${base}/statistic`}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-slate-200"
        >
          📝 {lastMock ? (lastMock.passed ? 'Thi thử: Đạt' : 'Thi thử: Chưa đạt') : 'Chưa thi thử'}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`

Expected: clean. (This exact file was type-checked against the real codebase while the plan was written — if you see errors, you have a typo rather than a design problem.)

- [ ] **Step 3: Verify the page renders in a real browser**

Run: `pnpm dev --port 3877`

Open `http://localhost:3877/vi/n400app/progress` (no auth guard on this route). Confirm, at a 390×844 mobile viewport:
- the ring, the skills card and the chip row are all visible **without scrolling**
- the ring percentage matches "Đạt N/5 điều kiện"
- no BadgeGallery is present
- tapping a skill row navigates to that skill's hub

Stop the dev server when done.

- [ ] **Step 4: Run the suite**

Run: `pnpm test 2>&1 | tail -4`

Expected: `Tests  301 passed (301)` — the 281 baseline plus 13 readiness and 7 heatmap tests. The overview page has no test of its own; its contract is asserted in Task 8.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/n400app/(app)/progress/page.tsx"
git commit -m "feat(n400): rebuild the progress overview around interview readiness

Hero + one skills card + chip row, replacing four StatsCards and the
BadgeGallery that duplicated the Tài khoản page."
```

---

### Task 7: Rewrite `/statistic` as the Chi tiết tab

Keeps the mock trend chart and the category-accuracy block (both already good), adds the full checklist, the section mock results and the wrong-answer debt, fixes the heatmap to count every skill, and deletes the five KPI cards plus the "Tiến độ theo danh mục" block that duplicated category accuracy.

**Files:**
- Rewrite: `src/app/[locale]/n400app/(app)/statistic/page.tsx`

- [ ] **Step 1: Replace the file wholesale**

```tsx
'use client';

// Tiến độ — tab 2 of 2, "Chi tiết". The Tổng quan tab answers the three
// questions at a glance; this tab explains them. Nothing here is repeated
// there: the KPI row and the duplicate category block were removed because
// the readiness checklist and the skills card already carry those numbers.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { ProgressTabs } from '@/components/n400/progress/ProgressTabs';
import { useN400UserState } from '@/lib/n400/user-state';
import { deriveReadiness } from '@/lib/n400/readiness';
import { buildHeatGrid, HEAT_COLORS, HEAT_WEEKDAYS } from '@/lib/n400/activity-heatmap';
import { lastWrongQuestionIds } from '@/lib/n400/quiz-engine';
import { lastWrongSectionItemIds } from '@/lib/n400/section-progress';
import {
  N400_CATEGORY_LABELS,
  N400_QUESTIONS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';

const CATEGORY_COLORS: Record<N400CategoryKey, string> = {
  principles: 'bg-teal-600',
  system: 'bg-orange-500',
  rights: 'bg-yellow-500',
  history: 'bg-purple-600',
  symbols: 'bg-blue-600',
};

const MOCK_MAX_SCORE = 20;
const MOCK_PASS_SCORE = 12;

export default function StatisticPage() {
  const { state, hydrated, stats } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  // Every skill lands on the calendar, not just civics.
  const heat = useMemo(
    () =>
      buildHeatGrid(
        [
          ...state.attempts.map((a) => ({ at: a.at })),
          ...state.sectionAttempts.map((a) => ({ at: a.at })),
        ],
        new Date(),
      ),
    [state.attempts, state.sectionAttempts],
  );

  const readiness = useMemo(
    () =>
      deriveReadiness({
        civicsKnown: stats.mastered,
        civicsTotal: N400_QUESTIONS.length,
        whatmeanKnown: state.sectionKnown.whatmean.length,
        whatmeanTotal: WHATMEAN_QUESTIONS.length,
        yesnoKnown: state.sectionKnown.yesno.length,
        yesnoTotal: YESNO_QUESTIONS.length,
        mockResults: state.mockResults,
        sectionMockResults: state.sectionMockResults,
      }),
    [stats.mastered, state.sectionKnown, state.mockResults, state.sectionMockResults],
  );

  const categoryAccuracy = useMemo(() => {
    const acc: Record<N400CategoryKey, { correct: number; total: number }> = {
      principles: { correct: 0, total: 0 },
      system: { correct: 0, total: 0 },
      rights: { correct: 0, total: 0 },
      history: { correct: 0, total: 0 },
      symbols: { correct: 0, total: 0 },
    };
    const categoryById = new Map(N400_QUESTIONS.map((q) => [q.id, q.category]));
    for (const a of state.attempts) {
      const cat = categoryById.get(a.questionId);
      if (!cat) continue;
      acc[cat].total += 1;
      if (a.wasCorrect) acc[cat].correct += 1;
    }
    return acc;
  }, [state.attempts]);

  // "Câu sai chưa ôn" — graded modes only; flashcard self-grades never create
  // or clear debt. Same helpers the study tip uses, so the counts agree.
  const debts = useMemo(
    () =>
      [
        { label: 'Civics', count: lastWrongQuestionIds(state.attempts).length, href: `${base}/practice?start=wrongs` },
        { label: 'What Mean', count: lastWrongSectionItemIds(state.sectionAttempts, 'whatmean').length, href: `${base}/speaking/what-mean?start=wrongs` },
        { label: 'Yes/No', count: lastWrongSectionItemIds(state.sectionAttempts, 'yesno').length, href: `${base}/speaking/yes-no?start=wrongs` },
        { label: 'Viết', count: lastWrongSectionItemIds(state.sectionAttempts, 'writing').length, href: `${base}/writing?start=wrongs` },
      ].filter((d) => d.count > 0),
    [state.attempts, state.sectionAttempts, base],
  );

  const mockTrend = state.mockResults.slice(-10);
  const lastWritingMock = useMemo(
    () => [...state.sectionMockResults].reverse().find((m) => m.section === 'writing') ?? null,
    [state.sectionMockResults],
  );
  const lastSpeakingMock = useMemo(
    () => [...state.sectionMockResults].reverse().find((m) => m.section === 'speaking') ?? null,
    [state.sectionMockResults],
  );

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  // A learner who has only touched Writing still has data — gate on every skill.
  const hasAnyActivity = state.attempts.length > 0 || state.sectionAttempts.length > 0;

  if (!hasAnyActivity) {
    return (
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300">
        <ProgressTabs />
        <Card className="mx-auto max-w-xl p-6 text-center sm:p-12">
          <h3 className="mb-2 text-2xl font-bold text-gray-800">Chưa có dữ liệu thống kê</h3>
          <p className="mb-6 text-sm text-gray-500">
            Bắt đầu học hoặc thi thử để xem tiến độ chi tiết theo từng kỹ năng.
          </p>
          <Link
            href={`${base}/study`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-700"
          >
            Bắt đầu học ngay <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 animate-in fade-in duration-300 sm:gap-6">
      <ProgressTabs />

      {/* 1. The full readiness checklist — the hero on /progress shows only the next item. */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800">Điều kiện sẵn sàng phỏng vấn</h3>
        <p className="mt-1 text-xs text-gray-400">
          Đạt {readiness.metCount}/{readiness.totalCount} điều kiện
        </p>
        <ul className="mt-4 space-y-2.5">
          {readiness.criteria.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  c.met ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {c.met ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <span className={`min-w-0 flex-1 text-sm ${c.met ? 'text-gray-500 line-through' : 'font-medium text-gray-800'}`}>
                {c.label}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-gray-400">{c.detail}</span>
              {c.met ? null : (
                <Link href={`${base}${c.cta.href}`} className="shrink-0 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  {c.cta.label} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* 2. Mock tests — all three kinds in one place. */}
      <Card className="p-5">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800">Kết quả thi thử</h3>
            <p className="mt-1 text-xs text-gray-400">Civics · Viết · Speaking</p>
          </div>
        </div>

        {mockTrend.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-sm text-gray-500">
            <div>Chưa có lần thi thử Civics nào.</div>
            <Link href={`${base}/mock-test`} className="mt-3 flex items-center gap-1 font-semibold text-teal-600">
              Bắt đầu thi thử <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="relative h-56 pl-8 pr-2 sm:h-64">
            <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-2 text-[10px] text-gray-400">
              <span>20</span>
              <span>15</span>
              <span>12</span>
              <span>5</span>
              <span>0</span>
            </div>
            {[20, 15, 12, 5, 0].map((v) => (
              <div
                key={v}
                className="pointer-events-none absolute left-8 right-2 border-t border-gray-100"
                style={{ bottom: `${(v / MOCK_MAX_SCORE) * 100}%` }}
              />
            ))}
            <div
              className="pointer-events-none absolute left-8 right-2 z-10 border-t-2 border-dashed border-teal-300"
              style={{ bottom: `${(MOCK_PASS_SCORE / MOCK_MAX_SCORE) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 rounded bg-teal-50 px-1 text-[10px] text-teal-600">
                Đạt: {MOCK_PASS_SCORE}
              </span>
            </div>
            <div className="absolute bottom-0 left-8 right-2 top-0 flex items-end gap-3">
              {mockTrend.map((m, i) => {
                const barHeight = (m.score / MOCK_MAX_SCORE) * 100;
                return (
                  <div
                    key={m.id}
                    className="relative h-full min-w-0 flex-1"
                    title={`${m.score}/${m.total} • ${new Date(m.completedAt).toLocaleDateString('vi-VN')}`}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-gray-700"
                      style={{ bottom: `calc(${barHeight}% + 4px)` }}
                    >
                      {m.score}
                    </div>
                    <div
                      className={`absolute bottom-0 left-1 right-1 rounded-t-lg transition-all duration-500 ${m.passed ? 'bg-teal-500' : 'bg-orange-400'}`}
                      style={{ height: `${barHeight}%`, minHeight: 4 }}
                    />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-400">
                      #{i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          {[
            { label: '✍️ Thi thử Viết', result: lastWritingMock, href: `${base}/mock-test/viet` },
            { label: '🎤 Thi thử Speaking', result: lastSpeakingMock, href: `${base}/mock-test/speaking` },
          ].map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100"
            >
              <span className="text-sm font-medium text-gray-700">{row.label}</span>
              {row.result ? (
                <span className={`text-xs font-bold ${row.result.passed ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {row.result.passed ? 'Đạt' : 'Chưa đạt'} · {row.result.score}/{row.result.total}
                </span>
              ) : (
                <span className="text-xs font-semibold text-teal-600">Chưa thi →</span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* 3. Where am I weak? */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800">Độ chính xác theo danh mục</h3>
          <p className="mt-1 text-xs text-gray-400">Civics · accuracy by topic</p>
          <div className="mt-6 space-y-4">
            {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
              const a = categoryAccuracy[key];
              const percent = a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{N400_CATEGORY_LABELS[key].vi}</span>
                    <span className="shrink-0 font-bold text-gray-800">
                      {percent}% <span className="text-xs font-normal text-gray-400">({a.correct}/{a.total})</span>
                    </span>
                  </div>
                  <ProgressBar progress={percent} colorClass={CATEGORY_COLORS[key]} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-800">Câu sai chưa ôn</h3>
          <p className="mt-1 text-xs text-gray-400">Ôn lại để xoá lỗi cũ</p>
          {debts.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              Bạn không còn câu sai nào chưa ôn. Giữ phong độ nhé! 🎉
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {debts.map((d) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3 hover:bg-orange-100"
                >
                  <span className="text-sm font-medium text-gray-700">{d.label}</span>
                  <span className="shrink-0 text-xs font-bold text-orange-600">{d.count} câu →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. Am I making progress? */}
      <Card className="p-5">
        <h3 className="mb-6 font-bold text-gray-800">Hoạt động học tập</h3>
        <div className="mb-2 flex pl-12 text-[10px] text-gray-400">
          {HEAT_WEEKDAYS.map((d) => (
            <div key={d} className="flex-1 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {heat.grid.map((row, weekIdx) => (
            <div key={weekIdx} className="flex items-center gap-2">
              <div className="w-10 text-[10px] text-gray-400">Tuần {weekIdx + 1}</div>
              <div className="grid flex-1 grid-cols-7 gap-1.5">
                {row.map((level, i) => (
                  <div key={i} className={`h-4 rounded-sm ${HEAT_COLORS[level]}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-gray-500">
          Ít
          <div className="flex gap-1">
            <div className="h-3 w-3 bg-teal-50" />
            <div className="h-3 w-3 bg-teal-300" />
            <div className="h-3 w-3 bg-teal-700" />
          </div>
          Nhiều
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-gray-500">Ngày học nhiều nhất:</span>
          <span className="font-semibold text-gray-800">{heat.busiestDay}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Tổng ngày đã học:</span>
          <span className="font-semibold text-gray-800">{heat.totalDays} ngày</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Chuỗi dài nhất:</span>
          <span className="font-semibold text-gray-800">{state.streak.longest} ngày</span>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`

Expected: clean.

- [ ] **Step 3: Verify in a real browser**

Run: `pnpm dev --port 3877`, open `http://localhost:3877/vi/n400app/statistic`, and confirm:
- the checklist shows all five criteria with ✓/✗ and matches the ring on `/progress`
- the Viết/Speaking mock rows render (they are the newly-read data)
- no KPI card row and no "Tiến độ theo danh mục" block remain
- at 390×844 the page scrolls cleanly with no horizontal overflow

Stop the dev server.

- [ ] **Step 4: Run the suite**

Run: `pnpm test 2>&1 | tail -4`

Expected: `mobile-layout.test.ts` now FAILS — it asserts the KPI grid string `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5` that you just deleted. That is a genuine contract change, and Task 8 updates it. Note the failure and continue.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/n400app/(app)/statistic/page.tsx"
git commit -m "feat(n400): rebuild the statistic tab as the progress deep-dive

Adds the readiness checklist, writing/speaking mock results and wrong-answer
debt; counts every skill on the activity calendar; drops the KPI row and the
duplicate category block."
```

---

### Task 8: Rewire navigation and update the IA contracts

`/progress` becomes the primary Tiến độ destination, so the sidebar, the tab bar and the dashboard hero's secondary CTA must all agree. The IA tests encode the old contract and must be updated with the change — they are the reason the old contract stays honest.

**Files:**
- Modify: `src/components/n400/progress/ProgressTabs.tsx`
- Modify: `src/components/n400/Sidebar.tsx`
- Modify: `src/lib/n400/hero-recommendation.ts`
- Modify: `src/components/n400/navigation-ia.test.ts`
- Modify: `src/components/n400/mobile-layout.test.ts`

- [ ] **Step 1: Relabel the tabs**

In `src/components/n400/progress/ProgressTabs.tsx`, replace the `tabs` array and the comment above the component:

```tsx
// Segmented switcher shown on both Tiến độ pages. The split is by DEPTH, not
// by data type: /progress answers the three questions at a glance, /statistic
// explains them. The sidebar has a single "Tiến độ" entry, pointing at
// /progress. The two pages keep their existing URLs.
```

```tsx
  const tabs = [
    { href: `${base}/progress`, label: 'Tổng quan' },
    { href: `${base}/statistic`, label: 'Chi tiết' },
  ];
```

- [ ] **Step 2: Point the sidebar and mobile nav at `/progress`**

In `src/components/n400/Sidebar.tsx`, the desktop `tiendo` entry becomes:

```tsx
  {
    id: 'tiendo',
    label: 'Tiến độ',
    subtitle: 'Theo dõi tiến độ và mức sẵn sàng phỏng vấn.',
    href: 'progress',
    icon: BarChart2,
    alsoMatch: ['statistic'],
  },
```

and the mobile entry becomes:

```tsx
  { id: 'tiendo', label: 'Tiến độ', href: 'progress', icon: BarChart2, alsoMatch: ['statistic'] },
```

- [ ] **Step 3: Point the dashboard hero's secondary CTA at `/progress`**

In `src/lib/n400/hero-recommendation.ts`, inside the `goal_complete` branch, change the secondary CTA:

```ts
      secondary: { label: 'Xem tiến độ', href: '/progress' },
```

- [ ] **Step 4: Update the navigation IA contracts**

In `src/components/n400/navigation-ia.test.ts`, in the test `desktop sidebar collapses to four top-level areas with subtitles`, replace:

```ts
    expect(desktop).toContain("href: 'statistic'");
```
with
```ts
    expect(desktop).toContain("href: 'progress'");
```

and replace the trailing contract:

```ts
    // One merged progress entry, pointing at statistic:
    expect(sidebar).not.toContain("href: 'progress'");
```
with
```ts
    // One merged progress entry, pointing at the Tổng quan tab:
    expect(sidebar).not.toContain("href: 'statistic'");
```

In the test `mobile nav is Home / Học tập / Thi thử / Tiến độ`, replace:

```ts
    expect(mobile).toContain("href: 'statistic'");
```
with
```ts
    expect(mobile).toContain("href: 'progress'");
```

- [ ] **Step 5: Add a contract for the new tab split**

In the same file, replace the test `both progress pages render the shared tab bar` with:

```ts
  test('both progress pages render the shared tab bar', () => {
    expect(source('src/app/[locale]/n400app/(app)/statistic/page.tsx')).toContain('ProgressTabs');
    expect(source('src/app/[locale]/n400app/(app)/progress/page.tsx')).toContain('ProgressTabs');
  });

  test('the two progress tabs split by depth and never duplicate badges', () => {
    const tabs = source('src/components/n400/progress/ProgressTabs.tsx');
    expect(tabs).toContain("label: 'Tổng quan'");
    expect(tabs).toContain("label: 'Chi tiết'");

    // Badges live on the Tài khoản page only — the gallery used to render on
    // both, which is the duplication this redesign removed.
    const overview = source('src/app/[locale]/n400app/(app)/progress/page.tsx');
    expect(overview).not.toContain('BadgeGallery');
    expect(source('src/app/[locale]/n400app/(app)/profile/page.tsx')).toContain('BadgeGallery');
  });

  test('readiness is derived by the shared engine on both tabs', () => {
    expect(source('src/app/[locale]/n400app/(app)/progress/page.tsx')).toContain('deriveReadiness');
    expect(source('src/app/[locale]/n400app/(app)/statistic/page.tsx')).toContain('deriveReadiness');
  });
```

- [ ] **Step 6: Update the mobile layout contract for the rebuilt statistic page**

In `src/components/n400/mobile-layout.test.ts`, replace the whole `statistics screen avoids fixed desktop columns on mobile` test with:

```ts
  test('progress tabs avoid fixed desktop columns on mobile', () => {
    const detail = source('src/app/[locale]/n400app/(app)/statistic/page.tsx');
    const overview = source('src/app/[locale]/n400app/(app)/progress/page.tsx');

    expect(detail).toContain('grid grid-cols-1 gap-4 xl:grid-cols-2');
    expect(detail).not.toContain('grid grid-cols-5 gap-4');
    expect(detail).not.toContain('className="w-3/5');
    expect(detail).not.toContain('className="w-2/5');

    // The overview must fit one mobile screen: compact stack, no desktop grid.
    expect(overview).toContain('gap-3');
    expect(overview).not.toContain('xl:grid-cols-5');
  });
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm test 2>&1 | tail -4`

Expected: **0 failed.** If `navigation-ia.test.ts` still fails on a `href: 'statistic'` assertion, you missed one of the two Sidebar entries in Step 2.

- [ ] **Step 8: Verify navigation end to end**

Run: `pnpm dev --port 3877`. From `http://localhost:3877/vi/n400app`, confirm:
- the sidebar/bottom-nav "Tiến độ" lands on the Tổng quan tab
- "Tiến độ" stays highlighted while on `/statistic` (that is what `alsoMatch` is for)
- both tabs switch correctly and the active tab is styled

Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add src/components/n400/progress/ProgressTabs.tsx src/components/n400/Sidebar.tsx src/lib/n400/hero-recommendation.ts src/components/n400/navigation-ia.test.ts src/components/n400/mobile-layout.test.ts
git commit -m "feat(n400): make the progress overview the primary Tiến độ destination

Tabs now split by depth (Tổng quan / Chi tiết); sidebar, mobile nav and the
dashboard hero all point at /progress."
```

---

### Task 9: Delete `StatsCard` and verify the whole feature

**Files:**
- Delete: `src/components/n400/progress/StatsCard.tsx`

- [ ] **Step 1: Confirm nothing imports it**

Run: `grep -rln "StatsCard" src/`

Expected: only `src/components/n400/progress/StatsCard.tsx` itself. If anything else appears, stop — a page still depends on it.

- [ ] **Step 2: Delete it**

```bash
git rm src/components/n400/progress/StatsCard.tsx
```

- [ ] **Step 3: Full verification**

Run each and confirm all three pass:

```bash
pnpm type-check
pnpm lint
pnpm test 2>&1 | tail -4
```

Expected: type-check clean, lint clean, `0 failed` tests.

- [ ] **Step 4: Confirm no migration crept in**

Run: `git diff --stat main -- supabase/ ../../supabase/`

Expected: **empty output.** This feature reads an existing table and must not have added, altered or dropped anything in the database.

- [ ] **Step 5: Confirm the redesign is net-negative on UI code**

Run: `git diff --stat main -- src/components/n400/progress/ "src/app/[locale]/n400app/(app)/progress/" "src/app/[locale]/n400app/(app)/statistic/"`

Expected: deletions in the same order of magnitude as insertions or greater — the point of the redesign was to remove duplicated surface, not add to it. If insertions dwarf deletions, re-read the spec's §8 before continuing.

- [ ] **Step 6: Final manual pass on mobile**

Run `pnpm dev --port 3877` and at a 390×844 viewport walk the whole feature:

| Check | Where |
|---|---|
| Tổng quan fits with **no vertical scroll** | `/vi/n400app/progress` |
| Ring % matches "Đạt N/5" and the Chi tiết checklist | both tabs |
| "Việc tiếp theo" CTA navigates to a real screen | `/progress` |
| Weakest skill (⚠️) matches the study page's "needs practice" badge | `/progress` vs `/study` |
| Badges appear on Tài khoản only; the chip links there | `/progress`, `/profile` |
| Calendar shows a day where you only studied Writing | `/statistic` |

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(n400): drop StatsCard, replaced by the unified skills card"
```

- [ ] **Step 8: Update the roadmap**

Per `CLAUDE.md`, tick the corresponding item in `docs/ROADMAP.md` if one exists for this work, then commit:

```bash
git add docs/ROADMAP.md
git commit -m "docs: tick progress screen redesign on the roadmap"
```

If no matching roadmap item exists, skip this step rather than inventing one.

---

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3 IA & routes (tab relabel, sidebar, hero href, badges removed) | 8, 6 |
| §4 Tab Tổng quan (hero, skills card, chips, empty state) | 5, 6 |
| §5 `readiness.ts` engine + engine harmony | 3 |
| §6 Tab Chi tiết (checklist, mocks, weakness, heatmap, deletions) | 7 |
| §7 Data fixes (read section mocks, empty state, heatmap inputs) | 2, 4, 7 |
| §8 Lean constraints (no migration, one pure module, delete > add) | 9 (verified in steps 4–5) |
| §9 Testing (readiness tests, heatmap test, mobile check) | 3, 4, 9 |

Not in this plan, deliberately: adding a "readiness complete 🎉" rung to the dashboard hero ladder. The spec puts it out of scope.
