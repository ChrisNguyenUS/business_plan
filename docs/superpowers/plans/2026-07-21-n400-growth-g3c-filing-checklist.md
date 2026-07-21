# N400 Growth Engine — G3c (Filing Checklist) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the N-400 Filing Checklist frame (spec §4.3): a bilingual in-app content page with device-local tickable items, the `checklist_viewed` funnel event, the seeded `open_checklist` education CTA (escalation-ladder "Free Checklist" rung), and the `filed = not_yet` L3 hero reaction deferred from G2 — plus the two minor findings from the G3b post-merge review.

**Architecture:** Content is PLACEHOLDER by user decision (2026-07-21) — the owner supplies and reviews real items before the `filing_checklist` flag flips; swapping content touches only `checklist-data.ts`. Tick state is localStorage per device (user decision, no migration for state; the only DB change is one seed row). The dashboard reaction reuses G2's `GROWTH_INTENT_TIERS` mechanism (immediate, not subject to the 7-day CTA cap — spec §3.4 says the answer must change the dashboard *immediately*, and the CTA engine's cap makes that impossible right after a prompt was shown); the seeded S10 CTA is the slower, capped, dismissible ladder rung. Both stand down once the checklist route is dark.

**Tech Stack:** Next.js App Router (**this repo's Next version has breaking changes; read `node_modules/next/dist/docs/` before writing page code**), Supabase (seed migration only), vitest (`// @vitest-environment jsdom` pragma for DOM tests — default env is node).

**Branch:** `feat/n400-growth-g3c` (worktree, per using-git-worktrees).

---

## Verified contracts (recon done 2026-07-21 — do NOT re-derive, but DO re-verify seed column names against n400_16 before applying the migration)

| Thing | Verified fact |
|---|---|
| `availableActions` | `growth-state.ts` **already** adds `open_checklist` when the `filing_checklist` flag is on. No change needed. |
| `ACTION_HREF` | `GrowthCtaCard.tsx:18` **already** maps `open_checklist: '/n400ready/filing-checklist'`. No change needed — G3c creates that route. |
| `checklist_viewed` | Already in `CLIENT_EVENT_TYPES` (`growth/events.ts:11`) and the n400_24 RLS whitelist. Emit via `ingestClientEvent('checklist_viewed', payload)` from `growth/ingest.ts`. No scoring rule reads it (checked `n400_growth_rules` live) — it is funnel telemetry only. |
| CTA seed pattern | `n400_16_growth_config.sql:89`: columns `(cta_id, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority)`, `ON CONFLICT (cta_id, variant) DO NOTHING` (variant defaults `'a'`). Live table has s1–s7+s9; **no** `open_checklist` row exists yet. |
| `conditions.journey_stage` | Already supported by `cta.ts` `meetsConditions` (s3 uses `{"journey_stage":"preparing","stalled_days":60}`). `'preparing'` is a real derived value (n400_21: `n400_filed IS FALSE → 'preparing'`). No evaluator change needed. |
| `GROWTH_INTENT_TIERS` | `hero-recommendation.ts:181` — array of `{ priority, match }`, sorted desc, first non-null wins; one tier exists (interview_mode, priority 90). Comment explicitly says "G3 appends rows here". `HeroCta.href` is **relative to the n400ready base** (interview_mode uses `/mock-test`), so the checklist href is `/filing-checklist`. |
| `HeroSignals` | `hero-recommendation.ts:46` — `journeyStage?` / `interviewDate?` are optional G2 fields; add the two new optional fields alongside them. `HeroIntent` is a string-literal union near the top of the file — add `'filing_checklist'`. |
| `useGrowthProfile` | `growth/use-growth-profile.ts` — client hook, fetches `growth_engine` flag with `.maybeSingle()` + own `n400_lead_profiles` row. Task 5 extends it to also fetch `filing_checklist` (switch to `.in(...)` + list). Dashboard consumes it at `dashboard-client.tsx:58,167`. |
| localStorage convention | `practice-mode.ts:24`: key format `n400:<feature>:<qualifier>`, all reads/writes wrapped in try/catch for private mode. `use-badges.ts` keys by userId. Checklist key: `n400:filing-checklist:<userId>`. |
| Dict | `growth:` section in `vi.ts:251` / `en.ts` (shapes must match or `N400Dict` type errors). `heroRec.intent.*` + `heroRec.cta.*` hold hero tier copy; `tFormat` imported from `./i18n/format` (relative to `src/lib/n400/`). `dict.common.loading` exists. |
| Page template | `src/app/n400ready/(app)/consultation/page.tsx` (G3b) is the closest sibling: `'use client'`, white rounded-[24px] card, teal accent, `useN400Lang()`, unmount-guarded effect, `router.replace('/n400ready')` deep-link guard, `role="alert"` on errors. |
| Flags (prod, checked live) | `growth_engine`+`cta_engine`+`booking_form` ON; `profiling`+`filing_checklist` OFF. **`profiling` OFF means no real user has a `journey_stage` yet** — S10 and the hero tier stay dark until the user flips `profiling`, independent of `filing_checklist`. |
| vitest env | Default environment is node; DOM tests start with `// @vitest-environment jsdom` (see `Flashcard.test.tsx:1`). |

## Review findings this plan fixes (from the 2026-07-21 G3b post-merge review)

1. **Dead payload:** `learning-signals.ts` still selects `mode` (top-level) and `answered_at, attempt_id` (nested embed) that nothing reads since the rollup rewire. → Task 1.
2. **Silent RPC failure:** `growth-context.ts` / `learning-signals.ts` swallow rollup RPC errors (`rollupRes.data ?? default`) — a failed `n400_graded_day_rollup` / `n400_learning_rollup` (e.g. migration missing on a branch DB) zeroes every signal and S2/S9 just stop firing with no log line. → Task 1.

## Out of scope (explicit)

- **Real checklist content** — owner-provided, swapped into `checklist-data.ts` before flag flip. The frame ships with `[PLACEHOLDER]` items.
- **`wants_guidance = yes` L3 reaction** (soft consultation CTA) — G2 deferred it to "G3"; it needs its own copy decision and touches the consultation group's gating. Defer to G4 alongside the Leads work.
- **Tick sync / `checklist_completed` scoring** — localStorage by decision; revisit only if G4 wants a completion signal.
- **CTA funnel view, internal_app Leads** — G4.

## File map

- Modify: `apps/website/src/lib/n400/growth/learning-signals.ts`, `growth-context.ts` (Task 1)
- Create: `apps/website/src/lib/n400/checklist-data.ts` (Task 2)
- Create: `apps/website/src/lib/n400/checklist-storage.ts` + `checklist-storage.test.ts` (Task 2)
- Create: `apps/website/src/app/n400ready/(app)/filing-checklist/page.tsx`; Modify: `src/lib/n400/i18n/vi.ts`, `en.ts` (growth.checklist) (Task 3)
- Create: `apps/website/supabase/migrations/n400_26_growth_checklist_cta.sql` (Task 4)
- Modify: `apps/website/src/lib/n400/hero-recommendation.ts` (+ test), `src/lib/n400/growth/use-growth-profile.ts`, `src/app/n400ready/(app)/dashboard-client.tsx`, `i18n/vi.ts`, `en.ts` (heroRec) (Task 5)
- Modify: `docs/ROADMAP.md` (Task 6)

---

### Task 1: G3b review cleanup — trim dead select fields, log rollup RPC errors

**Files:**
- Modify: `apps/website/src/lib/n400/growth/learning-signals.ts`
- Modify: `apps/website/src/lib/n400/growth/growth-context.ts`

- [ ] **Step 1: Trim the mock query select.** In `learning-signals.ts`, the `n400_quiz_attempts` select still fetches fields nothing reads since the rollup rewire (`DbMockQuiz` / `DbQuestionAttemptRow` already omit them, so tsc proves they're dead). Change the select string to:

```ts
      .select(
        `
        id, score, total_questions, passed, started_at, completed_at,
        n400_question_attempts ( question_id, was_correct )
      `,
      )
```

(Removes top-level `mode` — the query already filters `.eq('mode', 'mock_test')` — and nested `answered_at, attempt_id`.)

- [ ] **Step 2: Log RPC errors, same file.** Immediately after the `Promise.all` destructuring in `loadLearningSignals`, before the `rollup` constant:

```ts
  // A failed rollup must not be silent: the ?? fallback below degrades every
  // signal to zero, which reads as "user did nothing" — S2/S9 would just stop
  // firing with no trace. Log it; the fallback still keeps the page alive.
  if (rollupRes.error) console.error('n400_learning_rollup error:', rollupRes.error);
```

- [ ] **Step 3: Log RPC errors in `growth-context.ts`.** After its `Promise.all` destructuring in `loadGrowthContext`, before the `rows` constant:

```ts
  if (rollupRes.error) console.error('n400_graded_day_rollup error:', rollupRes.error);
```

- [ ] **Step 4: Full check** — in `apps/website`: `npx tsc --noEmit && npx vitest run`. Both green (no behavior change; existing tests must not need edits).
- [ ] **Step 5: Commit** — `fix(n400-growth): trim dead mock-select fields, log rollup RPC failures`

---

### Task 2: Checklist content data + device-local tick storage (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/checklist-data.ts`
- Create: `apps/website/src/lib/n400/checklist-storage.ts`
- Test: `apps/website/src/lib/n400/checklist-storage.test.ts`

These live in `src/lib/n400/` (not `growth/`) — they are app content/UI state like `practice-mode.ts`, not engine decision logic; the growth module only ever sees the `checklist_viewed` event.

- [ ] **Step 1: Write `checklist-data.ts`.**

```ts
// N-400 Filing Checklist content (spec §4.3). PLACEHOLDER COPY — every item
// below is a structural stand-in. The owner supplies the real steps/documents
// and reviews them BEFORE the `filing_checklist` flag flips (non-attorney
// disclosure applies, same as the website). Swapping in real content touches
// only this file.
//
// Content is bilingual data (like CTA copy in n400_cta_definitions), not UI
// chrome — so it lives here, not in the i18n dict.
//
// `id` is the localStorage tick key — stable forever once shipped. Renaming
// an id silently resets that item's tick on every device.

export interface ChecklistItem {
  id: string;
  title_vi: string;
  title_en: string;
  /** Optional one-line detail rendered under the title. */
  note_vi?: string;
  note_en?: string;
}

export interface ChecklistSection {
  id: string;
  title_vi: string;
  title_en: string;
  items: ChecklistItem[];
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'eligibility',
    title_vi: '[PLACEHOLDER] Kiểm tra điều kiện',
    title_en: '[PLACEHOLDER] Check your eligibility',
    items: [
      {
        id: 'elig-residency',
        title_vi: '[PLACEHOLDER] Đủ thời gian thường trú theo diện của bạn',
        title_en: '[PLACEHOLDER] Enough continuous residence for your category',
      },
      {
        id: 'elig-presence',
        title_vi: '[PLACEHOLDER] Đủ thời gian hiện diện thực tế tại Mỹ',
        title_en: '[PLACEHOLDER] Enough physical presence in the U.S.',
      },
      {
        id: 'elig-state',
        title_vi: '[PLACEHOLDER] Cư trú tại tiểu bang hiện tại đủ 3 tháng',
        title_en: '[PLACEHOLDER] 3 months of residence in your current state',
      },
    ],
  },
  {
    id: 'documents',
    title_vi: '[PLACEHOLDER] Chuẩn bị giấy tờ',
    title_en: '[PLACEHOLDER] Gather your documents',
    items: [
      {
        id: 'doc-green-card',
        title_vi: '[PLACEHOLDER] Bản sao thẻ xanh (2 mặt)',
        title_en: '[PLACEHOLDER] Copy of your green card (both sides)',
      },
      {
        id: 'doc-travel',
        title_vi: '[PLACEHOLDER] Danh sách các chuyến đi ra nước ngoài',
        title_en: '[PLACEHOLDER] List of trips outside the U.S.',
        note_vi: '[PLACEHOLDER] Ngày đi, ngày về, quốc gia — 5 năm gần nhất.',
        note_en: '[PLACEHOLDER] Departure/return dates and countries — last 5 years.',
      },
      {
        id: 'doc-photos',
        title_vi: '[PLACEHOLDER] Ảnh thẻ theo chuẩn USCIS',
        title_en: '[PLACEHOLDER] Passport-style photos per USCIS spec',
      },
    ],
  },
  {
    id: 'filing',
    title_vi: '[PLACEHOLDER] Nộp đơn N-400',
    title_en: '[PLACEHOLDER] File your N-400',
    items: [
      {
        id: 'file-review',
        title_vi: '[PLACEHOLDER] Rà soát toàn bộ câu trả lời trước khi nộp',
        title_en: '[PLACEHOLDER] Review every answer before submitting',
      },
      {
        id: 'file-fee',
        title_vi: '[PLACEHOLDER] Chuẩn bị lệ phí hoặc đơn miễn giảm',
        title_en: '[PLACEHOLDER] Prepare the fee or a fee-waiver request',
      },
      {
        id: 'file-copy',
        title_vi: '[PLACEHOLDER] Giữ một bản sao đầy đủ hồ sơ đã nộp',
        title_en: '[PLACEHOLDER] Keep a full copy of what you filed',
      },
    ],
  },
];

export const CHECKLIST_ITEM_IDS: readonly string[] = CHECKLIST_SECTIONS.flatMap(
  (s) => s.items.map((i) => i.id),
);
```

- [ ] **Step 2: Write the failing storage tests.**

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CHECKLIST_ITEM_IDS } from './checklist-data';
import { isChecklistComplete, loadTicks, saveTicks } from './checklist-storage';

const USER = 'u-test';

describe('checklist-storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns an empty set when nothing is stored', () => {
    expect(loadTicks(USER).size).toBe(0);
  });

  it('round-trips ticks per user', () => {
    saveTicks(USER, new Set([CHECKLIST_ITEM_IDS[0]]));
    expect([...loadTicks(USER)]).toEqual([CHECKLIST_ITEM_IDS[0]]);
    expect(loadTicks('someone-else').size).toBe(0);
  });

  it('drops unknown and non-string ids on load (stale content swap)', () => {
    window.localStorage.setItem(
      `n400:filing-checklist:${USER}`,
      JSON.stringify([CHECKLIST_ITEM_IDS[0], 'removed-item', 7]),
    );
    expect([...loadTicks(USER)]).toEqual([CHECKLIST_ITEM_IDS[0]]);
  });

  it('survives garbage in storage', () => {
    window.localStorage.setItem(`n400:filing-checklist:${USER}`, '{not json');
    expect(loadTicks(USER).size).toBe(0);
  });

  it('isChecklistComplete only when every item is ticked', () => {
    expect(isChecklistComplete(new Set())).toBe(false);
    expect(isChecklistComplete(new Set(CHECKLIST_ITEM_IDS.slice(0, 1)))).toBe(false);
    expect(isChecklistComplete(new Set(CHECKLIST_ITEM_IDS))).toBe(true);
  });
});
```

- [ ] **Step 3: Run — expect FAIL** — `npx vitest run src/lib/n400/checklist-storage.test.ts` (`checklist-storage` doesn't exist).
- [ ] **Step 4: Implement `checklist-storage.ts`.**

```ts
// Tick state for the Filing Checklist. Per-device by design (user decision
// 2026-07-21): localStorage, no table, no sync — the growth engine only ever
// sees the checklist_viewed event. Keyed by userId so a shared device does
// not leak ticks between accounts. All storage access is try/catch-wrapped
// for private mode, same as practice-mode.ts.

import { CHECKLIST_ITEM_IDS } from './checklist-data';

const storageKey = (userId: string) => `n400:filing-checklist:${userId}`;

export function loadTicks(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    // Unknown ids are dropped so a content swap can never leave the count
    // above the total (ids are stable, but items can be removed).
    return new Set(
      parsed.filter((v): v is string => typeof v === 'string' && CHECKLIST_ITEM_IDS.includes(v)),
    );
  } catch {
    return new Set();
  }
}

export function saveTicks(userId: string, ticks: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ticks]));
  } catch {
    /* private mode / storage disabled — ticks just don't persist */
  }
}

export function isChecklistComplete(ticks: ReadonlySet<string>): boolean {
  return CHECKLIST_ITEM_IDS.length > 0 && CHECKLIST_ITEM_IDS.every((id) => ticks.has(id));
}
```

- [ ] **Step 5: Run — expect PASS**, then `npx tsc --noEmit` green.
- [ ] **Step 6: Commit** — `feat(n400-growth): filing checklist content frame and device-local tick storage`

---

### Task 3: Checklist page + dict

**Files:**
- Create: `apps/website/src/app/n400ready/(app)/filing-checklist/page.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts` (inside `growth:`), `en.ts` (same keys)

- [ ] **Step 1: Add dict keys.** In `vi.ts` inside `growth:` (after `booking:`) add:

```ts
    checklist: {
      eyebrow: 'Tài liệu miễn phí',
      title: 'Checklist chuẩn bị hồ sơ N-400',
      subtitle: 'Các bước và giấy tờ cần chuẩn bị — đọc khoảng 3 phút.',
      progress: 'Đã chuẩn bị {done}/{total} mục',
      disclosure:
        'Manna One Solution không phải là công ty luật và không cung cấp tư vấn pháp lý. Thông tin này chỉ mang tính tham khảo chung.',
      consultTitle: 'Vẫn còn câu hỏi?',
      consultBody: 'Đặt buổi tư vấn miễn phí — đội ngũ Manna sẽ cùng bạn rà soát hồ sơ.',
      consultCta: 'Đặt tư vấn miễn phí',
      backToDashboard: 'Về trang chính',
    },
```

Mirror in `en.ts`: `eyebrow: 'Free resource'`, `title: 'N-400 Filing Checklist'`, `subtitle: 'The steps and documents to prepare — about a 3-minute read.'`, `progress: '{done}/{total} items prepared'`, `disclosure: 'Manna One Solution is not a law firm and does not provide legal advice. This information is general reference only.'`, `consultTitle: 'Still have questions?'`, `consultBody: 'Book a free consultation — the Manna team will review your application with you.'`, `consultCta: 'Book a free consultation'`, `backToDashboard: 'Back to dashboard'`.

- [ ] **Step 2: Build the page.** Before writing JSX, skim `consultation/page.tsx` (closest sibling) and the Next docs in `node_modules/next/dist/docs/` if anything App-Router-specific looks off.

```tsx
'use client';

// N-400 Filing Checklist (spec §4.3). Content page — tickable items persisted
// per device (checklist-storage), ending in the consultation hook. Flags off →
// bounce to the dashboard; the CTA/hero that link here are flag-gated too, so
// this is only a deep-link guard. The `checklist_viewed` event fires once per
// mount — it is UI telemetry (client-writable, n400_24), not scoring.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import { isFeatureOn, type FeatureFlag } from '@/lib/n400/growth/flags';
import { ingestClientEvent } from '@/lib/n400/growth/ingest';
import { CHECKLIST_ITEM_IDS, CHECKLIST_SECTIONS } from '@/lib/n400/checklist-data';
import { loadTicks, saveTicks } from '@/lib/n400/checklist-storage';

export default function FilingChecklistPage() {
  const { dict, lang } = useN400Lang();
  const { user } = useAuth();
  const router = useRouter();
  const t = dict.growth.checklist;

  const [ready, setReady] = useState(false);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const viewedLogged = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('n400_feature_flags')
        .select('flag_key, enabled, rollout_pct')
        .in('flag_key', ['growth_engine', 'filing_checklist']);
      if (cancelled) return;
      const flags = new Map((data ?? []).map((f) => [f.flag_key as string, f as FeatureFlag]));
      if (
        !isFeatureOn(flags.get('growth_engine') ?? null, user.id) ||
        !isFeatureOn(flags.get('filing_checklist') ?? null, user.id)
      ) {
        router.replace('/n400ready');
        return;
      }
      setTicks(loadTicks(user.id));
      setReady(true);
      if (!viewedLogged.current) {
        viewedLogged.current = true;
        void ingestClientEvent('checklist_viewed', {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (!user || !ready) {
    return <div className="text-sm text-gray-500">{dict.common.loading}</div>;
  }

  const toggle = (id: string) => {
    const next = new Set(ticks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicks(next);
    saveTicks(user.id, next);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
        <h1 className="mt-1.5 text-xl font-bold text-gray-800">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>
        <p className="mt-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {tFormat(t.progress, { done: ticks.size, total: CHECKLIST_ITEM_IDS.length })}
        </p>

        <div className="mt-5 space-y-6">
          {CHECKLIST_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                {lang === 'en' ? section.title_en : section.title_vi}
              </h2>
              <ul className="mt-2 space-y-2">
                {section.items.map((item) => {
                  const done = ticks.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={done}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          done
                            ? 'border-teal-200 bg-teal-50 text-gray-500'
                            : 'border-slate-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                            done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span>
                          <span className={done ? 'line-through decoration-teal-400' : ''}>
                            {lang === 'en' ? item.title_en : item.title_vi}
                          </span>
                          {(lang === 'en' ? item.note_en : item.note_vi) && (
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {lang === 'en' ? item.note_en : item.note_vi}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          {t.disclosure}
        </p>

        <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <h2 className="text-sm font-bold text-gray-800">{t.consultTitle}</h2>
          <p className="mt-1 text-sm text-gray-600">{t.consultBody}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/n400ready/consultation"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t.consultCta}
            </Link>
            <Link
              href="/n400ready"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t.backToDashboard}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

(`useN400Lang()` returning `{ lang, dict }` is verified against `i18n/provider.tsx:21` — `lang` is an `N400Lang` from `./config`; check its values (`'vi' | 'en'`) match the `lang === 'en'` comparisons above.) The consultation footer link goes to `/n400ready/consultation` (booking is live; its own page guards if the flag ever goes off).

- [ ] **Step 3: Type + dict parity check** — `npx tsc --noEmit` (vi/en key shapes must match).
- [ ] **Step 4: Full tests** — `npx vitest run`. Green.
- [ ] **Step 5: Commit** — `feat(n400-growth): filing checklist page with ticks, disclosure and consultation hook`

---

### Task 4: Migration n400_26 — seed the S10 checklist CTA

**Files:**
- Create: `apps/website/supabase/migrations/n400_26_growth_checklist_cta.sql`

- [ ] **Step 1: Re-verify the seed columns** against `n400_16_growth_config.sql:89` (and `\d n400_cta_definitions` via `mcp__supabase__execute_sql` if in doubt). The insert below mirrors n400_16 exactly (variant defaults `'a'`, `enabled` defaults true).

- [ ] **Step 2: Write the migration.**

```sql
-- Growth Engine G3c: seed the Filing Checklist education CTA — the
-- escalation ladder's "Free Checklist" rung (spec §4.1 rule 6, §3.4
-- filed=not_yet). Priority 45: below s3 (50 — by the time a preparing user
-- has stalled 60 days, the checklist rung was already offered) and above
-- s7 (40 — a not-yet-filed user's next step is the checklist, not a mock).
--
-- Unreachable until BOTH the `filing_checklist` flag is on (availableActions
-- gates the action) AND `profiling` is on (journey_stage is only ever set by
-- prompt answers) — seeding ahead of the flag flip is the n400_16 pattern.
INSERT INTO public.n400_cta_definitions
  (cta_id, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority) VALUES
  ('s10_filing_checklist','education',
   '✓ N-400 Filing Checklist','✓ Checklist chuẩn bị hồ sơ N-400',
   'The steps and documents to prepare before you file — a 3-minute read.','Các bước và giấy tờ cần chuẩn bị trước khi nộp — đọc chỉ 3 phút.',
   'Open the checklist','Xem checklist','open_checklist','{"journey_stage": "preparing"}',45)
ON CONFLICT (cta_id, variant) DO NOTHING;
```

- [ ] **Step 3: Apply** with `mcp__supabase__apply_migration` (name `n400_26_growth_checklist_cta`).
- [ ] **Step 4: Verify** via `execute_sql`: `SELECT cta_id, group_key, action, conditions, priority, enabled, variant FROM n400_cta_definitions WHERE cta_id = 's10_filing_checklist';` — one row, `education` / `open_checklist` / priority 45 / enabled true / variant `'a'`.
- [ ] **Step 5: Commit the SQL file** — `feat(n400-growth): seed the filing-checklist education CTA (S10)`

---

### Task 5: Hero intent tier — `filed = not_yet` recommends the checklist (TDD)

**Files:**
- Modify: `apps/website/src/lib/n400/hero-recommendation.ts`
- Modify: `apps/website/src/lib/n400/growth/use-growth-profile.ts`
- Modify: `apps/website/src/app/n400ready/(app)/dashboard-client.tsx`
- Modify: `apps/website/src/lib/n400/i18n/vi.ts`, `en.ts` (heroRec section)
- Test: `apps/website/src/lib/n400/hero-recommendation.test.ts`

This is the immediate L3 reaction (spec §3.4): answering `filed = not_yet` flips the dashboard hero to the checklist recommendation right away. The CTA engine cannot deliver "right away" — `mark_prompt_shown` stamps `last_growth_prompt_at` when the prompt appears, so the 7-day cap is always active in the minutes after an answer. The tier mechanism (G2's interview_mode precedent) bypasses the cap by design; the S10 CTA from Task 4 is the slower, capped, dismissible rung for users who reach the dashboard later.

- [ ] **Step 1: Add dict keys.** `vi.ts` `heroRec.intent` (next to `interviewMode`):

```ts
      checklist: {
        title: 'Chuẩn bị hồ sơ N-400',
        subtitle: 'Checklist các bước và giấy tờ — chỉ mất 3 phút.',
      },
```

and in `heroRec.cta`: `openChecklist: 'Xem checklist',`. Mirror in `en.ts`: `checklist: { title: 'Prepare your N-400 filing', subtitle: 'A checklist of steps and documents — just 3 minutes.' }` and `openChecklist: 'Open checklist',`.

- [ ] **Step 2: Write the failing tests.** The interview_mode tier tests (from line ~202) use a plain `baseSignals` object with spread overrides — reuse that exact object (it is in scope for the whole file; if it is scoped inside a `describe`, hoist it rather than duplicating). Cases:

```ts
describe('filing_checklist intent tier', () => {
  it('recommends the checklist when journey says preparing and the route is live', () => {
    const rec = recommendDailyHero(
      { ...baseSignals, journeyStage: 'preparing', checklistEnabled: true },
      vi,
    );
    expect(rec.intent).toBe('filing_checklist');
    expect(rec.cta.href).toBe('/filing-checklist');
  });

  it('stands down when the filing_checklist flag is off (route dark)', () => {
    const rec = recommendDailyHero({ ...baseSignals, journeyStage: 'preparing' }, vi);
    expect(rec.intent).not.toBe('filing_checklist');
  });

  it('stands down once every item is ticked on this device', () => {
    const rec = recommendDailyHero(
      { ...baseSignals, journeyStage: 'preparing', checklistEnabled: true, checklistDone: true },
      vi,
    );
    expect(rec.intent).not.toBe('filing_checklist');
  });

  it('loses to interview_mode when both could match', () => {
    const rec = recommendDailyHero(
      { ...baseSignals, journeyStage: 'interview_scheduled', checklistEnabled: true },
      vi,
    );
    expect(rec.intent).toBe('interview_mode');
  });
});
```

(`journeyStage: 'interview_scheduled'` and `'preparing'` are mutually exclusive in the DB CASE, so "both match" is only reachable through priority order — the test pins the order anyway.)

- [ ] **Step 3: Run — expect FAIL** — `npx vitest run src/lib/n400/hero-recommendation.test.ts` (type errors on the new signal fields / unknown intent).
- [ ] **Step 4: Implement in `hero-recommendation.ts`.**
  1. `HeroIntent` union: add `'filing_checklist'`.
  2. `HeroSignals`: after `interviewDate`, add:

```ts
  /** G3c — filing_checklist flag is on for this user (the route is live).
      The tier must stand down when the destination would bounce. */
  checklistEnabled?: boolean;
  /** G3c — every checklist item ticked on this device (checklist-storage).
      Device-local is fine for a hero: worst case the nudge reappears on a
      second device, and it is one tap to stand down again. */
  checklistDone?: boolean;
```

  3. Append to `GROWTH_INTENT_TIERS` (after the interview_mode tier object, before the `].sort(...)`):

```ts
  {
    // 70 — the user told us they haven't filed yet (journey_stage 'preparing').
    // The immediate L3 reward (spec §3.4 filed=not_yet) is the checklist
    // recommendation; the capped, dismissible S10 CTA covers later visits.
    priority: 70,
    match: (signals: HeroSignals, dict: N400Dict): HeroRecommendation | null => {
      if (!signals.checklistEnabled || signals.checklistDone) return null;
      if (signals.journeyStage !== 'preparing') return null;
      const t = dict.heroRec;
      return {
        intent: 'filing_checklist',
        emoji: '📋',
        title: t.intent.checklist.title,
        subtitle: t.intent.checklist.subtitle,
        cta: { label: t.cta.openChecklist, href: '/filing-checklist' },
        secondary: { label: t.cta.continueCivics, href: '/flashcards?filter=unknown' },
      };
    },
  },
```

- [ ] **Step 5: Extend `use-growth-profile.ts`.** The hook currently fetches only the `growth_engine` flag with `.maybeSingle()`. Switch to a list read and expose the checklist flag:

```ts
export interface GrowthProfile {
  enabled: boolean;
  /** filing_checklist flag on for this user — G3c hero tier gate. */
  checklistEnabled: boolean;
  journeyStage: 'exploring' | 'preparing' | 'filed' | 'waiting_interview' | 'interview_scheduled' | null;
  interviewDate: string | null;
}

const OFF: GrowthProfile = { enabled: false, checklistEnabled: false, journeyStage: null, interviewDate: null };
```

flags query becomes:

```ts
        supabase
          .from('n400_feature_flags')
          .select('flag_key, enabled, rollout_pct')
          .in('flag_key', ['growth_engine', 'filing_checklist']),
```

and the resolution:

```ts
      const flagRows = (flagRes.data ?? []) as FeatureFlag[];
      const flag = (key: string) => flagRows.find((f) => f.flag_key === key) ?? null;
      if (!isFeatureOn(flag('growth_engine'), user.id)) {
        setProfile(OFF);
        return;
      }
      setProfile({
        enabled: true,
        checklistEnabled: isFeatureOn(flag('filing_checklist'), user.id),
        journeyStage: (leadRes.data?.journey_stage ?? null) as GrowthProfile['journeyStage'],
        interviewDate: leadRes.data?.interview_date ?? null,
      });
```

(Verified: `FeatureFlag` in `growth/flags.ts:8` is `{ flag_key: string; enabled: boolean; rollout_pct: number }`, so the `flagRows.find` above typechecks as written.)

- [ ] **Step 6: Wire `dashboard-client.tsx`.** Where hero signals are built (line ~167), alongside `journeyStage`/`interviewDate` add:

```ts
      checklistEnabled: growth.enabled ? growth.checklistEnabled : false,
      checklistDone: user ? isChecklistComplete(loadTicks(user.id)) : false,
```

with imports `import { loadTicks, isChecklistComplete } from '@/lib/n400/checklist-storage';`. Check how the surrounding code accesses the authed user (the file already has one — reuse it; do not add a second auth hook). If the signals object is built during render, this localStorage read must be hydration-safe: follow whatever pattern the file already uses for client-only values (the growth profile itself is effect-driven, per its own comment on first-paint) — if signals are computed in render, gate `checklistDone` behind the same mounted/effect state the file uses for `growth`.

- [ ] **Step 7: Run** — `npx vitest run src/lib/n400/hero-recommendation.test.ts`, then the full suite + `npx tsc --noEmit`. Green.
- [ ] **Step 8: Commit** — `feat(n400-growth): filed=not_yet hero tier recommends the filing checklist`

---

### Task 6: Roadmap, full verification, flag checkpoint

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Full verification** — in `apps/website`: `npx tsc --noEmit && npx vitest run`. Both green, paste output in the task report.
- [ ] **Step 2: Update `docs/ROADMAP.md`** — add the G3c line after the G3b line, matching its format:

```markdown
- [x] **Website Phase 3E — N400 Growth Engine G3c (filing checklist)** — Filing Checklist frame behind `filing_checklist`+`growth_engine` flags (spec §4.3): bilingual content page at `/n400ready/filing-checklist` (PLACEHOLDER items in `checklist-data.ts` pending owner content review + non-attorney disclosure), device-local tick state (`checklist-storage.ts`, localStorage per user), `checklist_viewed` funnel event, seeded S10 education CTA (`open_checklist`, priority 45, n400_26), and the `filed=not_yet` L3 hero tier (`filing_checklist` intent, priority 70) with device-local stand-down once complete. Also clears the G3b review nits (dead select fields, silent rollup errors). Spec §4.3/§3.4. G4 (internal_app Leads) pending.
```

Also update the trailing "pending" clauses on the G2/G3a/G3b lines from "G3c (filing checklist), G4 (internal_app Leads) pending" to "G4 (internal_app Leads) pending".

- [ ] **Step 3: Commit** — `docs: mark growth engine G3c shipped in roadmap`
- [ ] **Step 4: CHECKPOINT — ask the user (do not decide for them):**
  1. **`filing_checklist` flag stays OFF** until the owner swaps real content into `checklist-data.ts` and reviews the disclosure — confirm that's still the intent (this is the one G-phase where the flag flip is content-gated, not code-gated).
  2. Reminder: `profiling` is also still OFF, so no real user has a `journey_stage` — S10 and the hero tier stay dark until BOTH flags flip. Flip `profiling` first or together?
  3. Merge per finishing-a-development-branch (G2/G3a/G3b precedent: merge to main, delete branch, clean worktree).

---

## Self-review notes

- **Spec coverage:** §4.3 checklist page EN/VI ~3 min with consultation ending (Task 3), owner-review-before-ship honored via placeholder content + flag gate (Tasks 2/6), non-attorney disclosure (Task 3 dict); §3.4 `filed=not_yet` dashboard reaction (Task 5); §4.1 rule 6 ladder rung as seeded CTA (Task 4); `checklist_viewed` funnel event (Task 3). Tick persistence = localStorage per user decision 2026-07-21 (no migration for state).
- **Not in this plan on purpose:** no `availableActions`/`ACTION_HREF` changes (already wired, verified); no evaluator change (`journey_stage` condition exists); no new event types; no scoring rule for checklist (spec has none); `wants_guidance` reaction deferred to G4.
- **Type continuity:** `CHECKLIST_ITEM_IDS`/`CHECKLIST_SECTIONS` (Task 2) are what Task 3's page and Task 5's `isChecklistComplete` consume; `loadTicks`/`saveTicks`/`isChecklistComplete` signatures match across Tasks 2/3/5; `checklistEnabled`/`checklistDone` named identically in `HeroSignals`, the tier, `GrowthProfile`, and the dashboard wiring; dict keys `growth.checklist.*` (Task 3) and `heroRec.intent.checklist.*`/`heroRec.cta.openChecklist` (Task 5) are distinct namespaces, both mirrored vi/en.
- **Known accepted tradeoffs:** hero stand-down is device-local (reappears on a second device — one tap to re-complete); `lang` accessor name in Task 3 must be verified against the provider; S10 priority 45 places it under s3's stalled-consultation escalation by design.
