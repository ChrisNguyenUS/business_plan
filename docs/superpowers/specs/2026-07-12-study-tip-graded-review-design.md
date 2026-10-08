# Study Tip Engine Redesign — Graded-only Review Debt + Action-first CTA

**Date:** 2026-07-12 · **Scope:** N400 app (`apps/website`) · **Status:** Approved in conversation

## Problem

1. The Study page tip ("Gợi ý dành cho bạn") duplicates two rungs of the dashboard
   hero ladder (stale skill, civics sprint), so both banners often say the same thing.
2. Its CTA ("Xem gợi ý") lands on a generic hub instead of starting the promised
   action — the user must re-decide mode/topic (mental load).
3. "Câu sai chưa ôn" counts flashcard self-grades in both directions: swiping
   "biết" clears real practice mistakes without any retrieval, and — via
   `pendingMockReviewIds` — a flashcard flip can silently clear mock-test review debt.
4. Exposing total debt ("56 câu sai") is demotivating.

## Decisions

### D1 — Graded-only definition of wrong/reviewed (Variant B)

"Wrong" and "reviewed" are measured **only from graded modes** (`practice`,
`mock_test`). Flashcard attempts are excluded from this concept in **both**
directions (they neither create nor clear debt). Flashcard "chưa thuộc" keeps its
own lifecycle via `flashcardKnown` + `/flashcards?filter=unknown`.

A question/item is *wrong-unreviewed* while its **last graded attempt** is wrong;
a later correct graded attempt clears it; a later wrong graded attempt re-opens it.

`pendingMockReviewIds` is fixed accordingly: only graded attempts after the mock
can clear a mock wrong.

Out of scope (documented follow-up): module *accuracy* and badge logic still count
flashcard self-grades; revisit separately.

### D2 — New tip ladder (cuts the two hero-duplicated rungs)

| # | Signal (scope) | Copy | CTA href |
|---|---|---|---|
| 1 | Module with most wrong-unreviewed items, ≥3 (all 4 modules) | "Ôn lại {min(n,10)} câu {module} bạn trả lời sai." | civics → `/practice?start=wrongs`; sections → module hub (Phase 1) |
| 2 | Weakest civics category via `recommendWeakCategory` (unified with practice) | "Bạn thường sai chủ đề {label}." | `/practice?start=weak` |
| 3 | Lowest-accuracy started module | unchanged copy | module hub |
| 4 | Lowest-coverage incomplete module (only when the user has started something) | "{label} mới học {done}/{total} câu." | module hub |
| 5 | Brand-new fallback | unchanged | `/study/civics` |

Stale-skill and finish-civics rungs are **removed** — the dashboard hero owns them.

### D3 — Action-first CTA, chunked debt

- Button label: "Xem gợi ý" → **"Luyện ngay"**.
- Never surface total debt before a session: tip offers a ≤10-question chunk.
- Card secondary link displays capped counts: `15+` when >15.
- New deep link `/practice?start=wrongs`: ephemeral review session of up to 10 ids
  = pending mock wrongs first, then remaining graded wrongs (most recent first).
  Empty → falls back like `?start=review` (weak-topic session, else standard).

## Implementation (Phase 1)

- `quiz-engine.ts`: export `gradedOnly()` filter + `lastWrongQuestionIds()`
  (graded-only, most-recently-wrong first).
- `hero-recommendation.ts`: `pendingMockReviewIds` ignores flashcard attempts.
- `study-modules.ts`: new `StudyTipSignals` + ladder above; drop
  `WEAK_CATEGORY_MIN_WRONG` / `FINISH_CIVICS_THRESHOLD` / stale fields.
- `study/page.tsx`: graded-only wrong counts (civics + sections), weakest category
  via `recommendWeakCategory`, new tip signals, CTA label, `15+` cap.
- `practice/page.tsx`: `?start=wrongs` deep link; `recommendation` memo filters
  graded-only.
- Tests: `study-modules.test.ts` (new ladder), `quiz-engine.test.ts` (helpers),
  `hero-recommendation.test.ts` (flashcard cannot clear mock debt).

## Phase 2 (separate branch/commit, later)

Real review sessions for Writing / Yes-No / What Mean practice pages
(`?start=review` pattern), and point the cards' "Ôn lại câu sai (n)" links at them.

**Status 2026-10-08:** Phase 2 shipped earlier (What Mean / Yes-No / Viết hubs have the `wrongs` mode and `?start=wrongs`; Study and Statistic links point at them).

## Phase 3 — mock items join the debt (owner, 2026-10-08)

Speaking and Writing mocks — standalone (`/mock-test/speaking`, `/mock-test/viet`) and the Full interview's Speaking and Writing parts — recorded only an aggregate result, so a miss there never reached "Ôn câu sai" (a Civics mock miss does). Each finished mock now also writes one `n400_section_attempts` row per item with `mode = 'mock_test'` (`section-mock-items.ts`, `recordSectionMockItems`), which D1 already treats as graded: a miss joins the debt, a right answer counts toward "thuộc", and a later graded answer clears or re-opens it. The aggregate row (`recordSectionMockResult`) still owns streak and badges; an abandoned mock records nothing.
