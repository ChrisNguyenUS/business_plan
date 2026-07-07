# N400 Study Sections Expansion — Session Handoff

**Date:** 2026-07-07
**Branch:** all work merged to `main`
**Scope:** `apps/website` — n400app only

This document lets a fresh session pick up the N400 expansion work. It summarizes
what was decided, what shipped, and exactly what's left.

---

## 1. The goal (what we're building)

Expand the n400app (a US citizenship study app; Vietnamese UI) beyond its existing
128-question Civics content to cover the rest of the real USCIS interview:

- **What Mean** — 62 vocabulary terms ("What does *oath* mean?"): flashcards + MC practice.
- **Yes No** — 37 Part 12 questions ("Have you ever committed a crime?"): flashcards + Yes/No practice, with keyword highlighting.
- **Writing** — 45 dictation sentences: listen (no text) → type the sentence back.
- **Thi thử split** into 3 mock tests: Civics (unchanged), Viết (3 sentences, pass ≥1/3), Speaking (10 items = 5 What Mean MC + 5 Yes No audio-only).
- **Badges** — 50-badge system across all sections + gamification.

### Final navigation (agreed)

```
n400app/
├── Tổng quan            — Daily Goals + "5 thẻ What Mean" / "5 thẻ Yes No" cards
├── 📚 CIVICS (128 câu)  — Luyện tập, Flashcards          [UNCHANGED]
├── 🎤 SPEAKING          — Câu hỏi What Mean, Câu hỏi Yes No
├── ✍️ WRITING (45 câu)  — dictation practice
├── 🎯 Thi thử           — Civics / Viết / Speaking (3-card picker)
└── 📊 Tiến độ           — + stats for What Mean, Yes No, Writing
```

Mobile bottom nav stays at 4 items (Tổng quan, Luyện tập, Flashcards, Thi thử);
Speaking/Writing are reached from Tổng quan cards on mobile (those cards land in Plan 2c).

---

## 2. Source-of-truth documents

- **Design spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md`
- **Badge definitions:** `docs/N400_badge_definitions.md` (50 badges; 8 reuse existing, 40 build new, 2 dropped; decisions finalized)
- **Plans (in `docs/superpowers/plans/`):**
  - `2026-07-06-n400-expansion-1-foundation.md` — ✅ DONE
  - `2026-07-06-n400-expansion-2a-speaking-infra.md` — ✅ DONE
  - `2026-07-06-n400-expansion-2b-whatmean-section.md` — ✅ DONE (+ UI-match fix)
  - `2026-07-07-n400-expansion-2c-yesno-section.md` — ✅ WRITTEN (ready for execution)
  - `2026-07-07-n400-expansion-3-writing-section.md` — ✅ WRITTEN (ready for execution)
  - `2026-07-07-n400-expansion-4-gamification.md` — ✅ WRITTEN (ready for execution)

### Content files (owner-provided, all present)

| Set | Docs | Count | Audio (`apps/website/public/n400-audio/`) |
|---|---|---|---|
| What Mean | `docs/learning_type/what_mean_questions/N400_what_mean_{en,vi}.md` + `multiple_choice_distractions` | 62 | `What_mean_questions/{question,answer}/<n>.mp3` |
| Yes No | `docs/learning_type/yes_no_questions/{en,vi}.md` (has `**Answer:** Yes/No`) | 37 | `Yes_no_question/sound/<n>.mp3` |
| Writing | `docs/learning_type/writing_questions/N400_writing_{en,vi}.md` | 45 | `Writing_questions/<n>.mp3` |
| Civics | (existing) | 128 | `civic_question/q###.mp3`, `civic_answer/a###.mp3` |

Badge PNG assets: `apps/website/public/images/n400/New badges/` (50 files, committed, ready for Plan 4).

---

## 3. What shipped (all merged to `main`)

### Plan 1 — Foundation
- Re-pointed civics audio to the reorganized `civic_question/`/`civic_answer/` folders (was broken); bumped service-worker cache to `n400-audio-v2`.
- Audio URL helpers in `quiz-engine.ts`: `whatMeanQuestionAudioUrl`, `whatMeanAnswerAudioUrl`, `yesNoAudioUrl`, `writingAudioUrl`.
- Build scripts → generated typed data modules (data-only, reproducible, fail-loud validation):
  - `scripts/n400-build-whatmean.mjs` → `src/lib/n400/whatmean-data.ts` (`WHATMEAN_QUESTIONS`, ids `wm-1..62`)
  - `scripts/n400-build-yesno.mjs` → `src/lib/n400/yesno-data.ts` (`YESNO_QUESTIONS`, ids `yn-1..37`, `answer: 'yes'|'no'`)
  - `scripts/n400-build-writing.mjs` → `src/lib/n400/writing-data.ts` (`WRITING_SENTENCES`, ids `wr-1..45`)
  - Note: Yes No #29's non-standard source answer ("I have never been sentenced…") is special-cased to `'no'`, scoped to id 29, pinned in tests. **All 37 Yes No answers are currently "no"** — there are no "Yes" answers in the set (see §6).

### Plan 2a — Speaking infrastructure
- Migration `supabase/migrations/n400_12_section_attempts.sql` (applied to remote Supabase). Flat table: `user_id, section('whatmean'|'yesno'|'writing'), item_id(text), mode, was_correct, answered_at`. RLS owner-only. Civics attempts stay in `n400_question_attempts` (INT FK); string-id sections use this new table.
- `src/lib/n400/section-progress.ts` — `SectionKey`, `SectionAttempt`, `deriveSectionKnown` (last flashcard attempt wins), `deriveSectionSeen`.
- `src/lib/n400/daily-five.ts` — `dailyFiveSelection(allIds, known, seen, seedKey, count)`: deterministic per `${section}:${date}`, priority unseen → learning → 1 review slot; pure-review day when all mastered.
- `src/lib/n400/section-presets.ts` — `WHATMEAN_PRESETS` (5/15/30/full), `YESNO_PRESETS` (5/10/20/full). Same 4 preset ids as civics so `PracticeSessionPicker` reuses its icons/theme.
- `AudioButton` gained `rate` + `variant="slow"` (🐢 turtle icon, `playbackRate` with `preservesPitch`).
- `keyword-match.ts` — `findKeywordSpans(text, terms)`: underlines What Mean vocab inside Yes No question text; handles inflections (claim→claimed), longest-term-wins, negative-lookahead so "Current" ≠ "currently". Covers 23/37 Yes No questions.
- `user-state.tsx` + `storage.ts` — `N400State` gained `sectionAttempts` + `sectionKnown`; new methods `recordSectionAnswer(section, itemId, wasCorrect, mode)` and `setSectionKnown(section, itemId, known)` (mirror civics streak logic; badges deferred to Plan 4). `resetAll` clears the new table.

### Plan 2b — Navigation + What Mean section
- Route `app/[locale]/n400app/speaking/what-mean/{layout,page}.tsx`: immersive layout + landing (Daily 5 hero, Học tất cả, Luyện tập picker) with a `landing → deck → practice` mode machine.
- Sidebar grouped into **CIVICS** and **SPEAKING** headings (desktop); mobile unchanged.
- `whatmean-options.ts` — `buildWhatMeanOptions(q, seed)`: 4 MC options (definition + 3 authored distractors), positions shuffled.
- `section-daily.ts` — `sectionDailyFive` + `dailyFiveDoneCount` for the "x/5" hero.

### UI-match fix (critical — see §4)
After the first 2b pass, the owner required Speaking/Writing UI to be **pixel-identical to Civics**. Fixed by:
- Generalizing the real civics `Flashcard`/`FlashcardFront` with an **optional `badge`** + **optional bookmark** (civics behavior unchanged via defaults).
- New **shared** screens that copy the civics chrome exactly:
  - `src/components/n400/speaking/SectionFlashcardScreen.tsx` — civics flashcards chrome (Flashcard/List toggle, status chips, Câu x/N + progress, Chưa thuộc/Đã thuộc controls) reusing the real `Flashcard`.
  - `src/components/n400/speaking/SectionMCQuiz.tsx` — civics practice chrome (progress + Đổi chế độ/Trộn lại, 2-col question card + 2×2 A/B/C/D grid + reveal feedback + Xem đáp án/Tiếp theo, right motivational sidebar, `PracticeSessionSummary`).
- Removed the earlier custom `SectionFlashcard`, `SectionFlashcardDeck`, `WhatMeanPractice`.
- **These two shared screens are designed to back Yes No and Writing too.**

---

## 4. CRITICAL constraint for all remaining UI work

**Every Speaking/Writing flashcard + practice/quiz screen MUST look identical to
the Civics flashcard and Civics practice screens.** Do NOT build custom-styled
components. Reuse:
- `SectionFlashcardScreen` (feed it `SectionCard[]`) for any flashcard mode.
- `SectionMCQuiz` (feed it `MCQuestion[]`) for any multiple-choice mode.
- The real civics `Flashcard` (now generalized) for the card itself.

For Yes No (a 2-button Yes/No answer, not 4-option MC) and Writing (typed
dictation), you'll need analogous shared screens that reuse the SAME civics
chrome — extend the pattern, don't reinvent. This is saved in memory as
`speaking-writing-match-civics-ui`.

---

## 5. What's left (write these plans next)

### Plan 2c — Yes No section + finish Speaking
- Route `speaking/yes-no` reusing `SectionFlashcardScreen` for flashcards.
- A **Yes/No practice screen** (like `SectionMCQuiz` but two buttons `[Yes, officer]`/`[No, officer]` graded against `answer`) — build as a shared screen matching civics chrome.
- Flashcard back: VI meaning + standard answer; **keyword highlighting** on the question text using `findKeywordSpans` (Plan 2a) with a definition popover.
- 🐢 slow-playback on Yes No audio (`AudioButton variant="slow" rate={0.7}`).
- Add What Mean + Yes No **Daily Goals entry cards on Tổng quan** (mobile entry point) and add both to the SPEAKING sidebar group (What Mean already there; add Yes No).

### Plan 3 — Writing section + Thi thử split
- `writing` route: dictation practice (audio-only, type sentence back, per-word diff, retype-on-wrong). USCIS grader: punctuation/capitalization never fail; minor spelling passes (edit-distance); abbreviations fail; guidance box (viết hoa tên riêng, không viết tắt).
- Thi thử picker → 3 cards: Civics (existing), **Viết** (3 dictation sentences, complete all 3, pass ≥1/3), **Speaking** (10 items = 5 What Mean MC + 5 Yes No audio-only Yes/No buttons, pass ≥8/10, wrong items link back to section cards).

### Plan 4 — Gamification
- Tổng quan Daily Goals items + Tiến độ stat blocks for the 3 new sections.
- 40 new badges per `docs/N400_badge_definitions.md` (evaluators read `n400_section_attempts`). Icons in `public/images/n400/New badges/`.

---

## 6. Open items / decisions for the owner

- **Yes No has no "Yes" answers.** All 37 Part 12 questions in the source are answer=No. This makes the Speaking mock trivially gameable (always press No). Owner may want to add the affirmative Part 12 questions (Do you support the Constitution? / willing to take the Oath?…) to `docs/learning_type/yes_no_questions/{en,vi}.md` with `**Answer:** Yes` and bump the `EXPECTED` count in `scripts/n400-build-yesno.mjs`.
- **Yes No #29** loses its "(Note: …)" qualifier (no note field in the data model). Add an `answerNote` field in Plan 2c if the note should show on the flashcard.
- **Visual verification pending:** the authenticated What Mean flow (Daily 5, flip, audio, mastery persistence, MC quiz) needs the owner to log in and eyeball it — automated checks (type-check, 181 tests, build, dev smoke) all pass but can't cover the logged-in UI.

---

## 7. Workflow used (repeat for remaining plans)

brainstorming → writing-plans → subagent-driven-development (fresh subagent per
task + spec review + code-quality review) → verification → finishing-a-development-branch.
Each plan runs on its own `feat/…` branch off `main`. Pure-logic tasks were often
done inline; UI tasks reuse civics components. All work is TDD where testable;
data modules have on-disk audio-existence tests. Commit style: `feat(n400app): …`
with `Co-Authored-By: Claude Fable 5`.

Verification gate: `cd apps/website && npm run type-check && npm run test` (currently
181 tests), plus `npm run build` for route changes and a dev smoke (`npm run dev`,
routes should 307 to login, not 500).
