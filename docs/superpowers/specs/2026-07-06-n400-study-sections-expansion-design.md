# N400 Study Sections Expansion — Design Spec

**Date:** 2026-07-06
**Scope:** `apps/website` — n400app only
**Type:** Information architecture expansion + new study surfaces (What Mean, Yes No, Writing) + mock-test split into 3 tests.

## Problem

The n400app today teaches a single content type — 128 civics questions — through
mode-first navigation (Luyện tập, Flashcards, Thi thử). The real USCIS interview
also tests three things the app does not cover:

1. **Vocabulary comprehension** — the officer asks "What does *oath* mean?" /
   "Can you define *felony*?" while reviewing the N-400 form.
2. **Part 12 Yes/No questions** — "Have you ever committed a crime…?". The skill
   tested is *listening to and understanding the question*.
3. **Writing test** — the officer dictates a sentence; the applicant writes it.
   Real format: up to 3 sentences, 1 correct passes.

Stuffing the new pools into the existing Luyện tập/Flashcards pages would force
content pickers into every mode and muddle per-content statistics.

## Decision

**Hybrid IA, content-grouped.** Civics stays exactly as it is (Luyện tập +
Flashcards). Two new top-level content sections join it: **Speaking** (a group
holding **Câu hỏi What Mean** and **Câu hỏi Yes No**, each built around a
"Daily 5" flashcard habit; What Mean additionally gets a multiple-choice Luyện
tập) and **Writing** (dictation practice over the 45 writing sentences).
**Thi thử** becomes a picker with three tests: Civics (unchanged), Viết, and
Speaking.

Top-level order: **Tổng quan — Civics 128 câu — Speaking — Writing — Thi thử —
Tiến độ.**

## Navigation

```
n400app/
├── Tổng quan            — Daily Goals gains: "5 thẻ What Mean", "5 thẻ Yes No"
│
├── 📚 CIVICS (128 câu)
│   ├── Luyện tập        — UNCHANGED
│   └── Flashcards       — UNCHANGED
│
├── 🎤 SPEAKING          — NEW group
│   ├── Câu hỏi What Mean — Daily 5 + Học tất cả + list + Luyện tập MC
│   └── Câu hỏi Yes No    — Daily 5 + Học tất cả + list + Luyện tập Yes/No,
│                            🐢 đọc chậm, keyword highlighting
│
├── ✍️ WRITING           — NEW section (45 câu writing sentences)
│     Luyện tập dictation: nghe → gõ lại nguyên câu (session picker)
│
├── 🎯 Thi thử — picker with 3 cards
│   ├── Thi thử Civics    — UNCHANGED (existing mock test)
│   ├── Thi thử Viết      — NEW (3 dictation sentences, pass ≥ 1/3)
│   └── Thi thử Speaking  — NEW (10 câu: 5 What Mean MC + 5 Yes No audio-only)
│
└── 📊 Tiến độ            — adds stat blocks for What Mean, Yes No, Writing
```

## One practice theme across the app

Every section's Luyện tập uses the **same session-picker pattern** the civics
practice already has (resume hero "Tiếp tục học" + preset cards with icon,
count, and time estimate). `PracticeSessionPicker` is generalized to take the
section's pool size and presets; icons, tier names, and colors stay identical
so the app reads as one system. Counts are scaled per pool:

| Preset | Civics (128) | What Mean (62) | Yes No (37) | Writing (45) |
|---|---|---|---|---|
| ⚡ Luyện nhanh | 5 | 5 | 5 | 3 |
| 📋 Tiêu chuẩn | 15 | 15 | 10 | 10 |
| 📚 Chuyên sâu | 40 | 30 | 20 | 20 |
| 🏛 Ôn toàn bộ | 128 | 62 | 37 | 45 |

Civics numbers are unchanged. Writing's Luyện nhanh is 3 câu on purpose — the
same size as the real dictation test. Time estimates: ~30s/câu for MC and
Yes No, ~90s/câu for Writing dictation.

- **Desktop sidebar** (`Sidebar.tsx`): group headers (CIVICS / SPEAKING) with
  section links nested under them; Writing is a single top-level link.
- **Mobile bottom nav**: stays at 4 items (Tổng quan, Luyện tập, Flashcards,
  Thi thử). The Speaking sections are reached from Tổng quan via their Daily
  Goals cards; Writing gets its own entry card on Tổng quan.

## Section: Câu hỏi What Mean (62 câu)

- **Landing**: hero "Daily 5 hôm nay" (progress x/5) → daily flashcard session;
  "Học tất cả" (full deck); cards | list toggle reusing the Flashcards page
  pattern; entry to **Luyện tập MC**.
- **Flashcard**: front = term + question phrasing (e.g. "What does *alien*
  mean?") + question audio; back = EN definition + VI meaning + answer audio.
  Known/unknown (thuộc/chưa thuộc) reuses the `flashcardKnown` mechanism.
- **Daily 5 selection**: deterministic per local date (seeded) so reloading
  never re-rolls. Priority: unseen → chưa thuộc → fill with 1 đã-thuộc card for
  review. No full SRS (YAGNI). Completing the Daily 5 ticks its Daily Goals item
  and feeds streak/XP.
- **Luyện tập MC**: multiple-choice practice mirroring the civics Luyện tập,
  using the shared session picker (presets 5/15/30/62). 1 correct + 3
  distractors per question from the prepared distractor file.
  **Answer positions MUST be shuffled per render** — the source file marks the
  correct option in fixed positions; never present them in file order.

## Section: Câu hỏi Yes No (37 câu)

Same landing, Daily 5, list view, and known/unknown mechanics as What Mean —
the Daily 5 session shell is built once and shared by both sections.

- **Flashcard front**: full EN question + audio with **🐢 đọc chậm**.
- **Flashcard back**: VI translation + the question's standard answer
  (Yes/No, from the data file).
- **Luyện tập**: uses the shared session picker (presets 5/10/20/37). Each
  item shows the question text (keywords highlighted) + audio; the user answers
  **[Yes, officer] / [No, officer]**, graded against the standard answer, with
  the VI meaning shown as feedback.
- **Keyword highlighting** (list view, Flashcards "Học tất cả", and Daily 5):
  keywords
  inside the question text are **underlined with an accent color** (not
  ALL-CAPS — readability and screen readers). Keywords are found by
  auto-matching the 62 What Mean vocabulary terms against the question text
  (the vocab list was built from Part 12, so coverage is natural). Tapping a
  highlighted keyword shows its What Mean definition inline (popover), linking
  the two sections the way real interviews chain "Have you ever…?" with
  "What does X mean?".

## Section: Writing (45 câu)

Top-level section. Pool: the 45 writing sentences
(`docs/learning_type/writing_questions/`), the same set the real dictation
test draws from. This is pure dictation — the user types back the sentence
they hear, exactly like the interview's writing test.

The section landing uses the shared session picker (presets 3/10/20/45 —
Luyện nhanh is 3 câu, the same size as the real test).

### Flow

```
🔊 Sentence audio autoplays — NO text shown
   [Nghe lại]  [🐢 Đọc chậm]
   [ type the sentence… ]
   [Kiểm tra]   [🙉 Không nghe được / Không thuộc]

├─ CORRECT   → show the sentence + per-word diff (all green) → next
├─ WRONG     → show the correct sentence with per-word diff
│              (correct words green, wrong/missing red)
│              → user MUST retype it correctly once (active recall) → next
└─ "Không nghe được / Không thuộc"
               → reveal the sentence caption
               → user retypes it verbatim (per-word diff) → next
               → sentence flagged "cần ôn lại" (prioritized later);
                 NOT counted as a wrong answer
```

Progress: each sentence tracks thuộc/chưa thuộc like the flashcard sections;
the session prioritizes chưa thuộc and "cần ôn lại" sentences.

### Grading rules (shared by Writing practice and Thi thử Viết)

Grading follows the official USCIS standard: *"An applicant will not fail
because of spelling, capitalization, or punctuation errors unless the errors
would prevent understanding the meaning of the sentence."* Concretely:

1. **Punctuation and capitalization never fail an answer.** Normalize before
   comparing: trim, collapse whitespace, strip all punctuation,
   case-insensitive; compare word-by-word against the canonical sentence.
2. **Minor spelling errors pass**: edit distance 1 per word (2 for words ≥ 8
   characters) counts as correct — the word is still understandable. Larger
   errors that change or destroy the word fail it.
3. **Teaching feedback still shown**: capitalization slips on proper nouns and
   spelling slips produce a yellow hint ("Nhớ viết hoa: *New York City*"),
   without affecting the pass/fail result.
4. **Abbreviations fail**: "NYC" is not the word "New York City"; feedback
   explains the no-abbreviation rule.

### Guidance box

Always visible in Writing practice and Thi thử Viết:

> ✍️ Quy tắc viết: **viết hoa** tên người và tên địa danh (Washington,
> New York City). **Không viết tắt** — viết "New York City" chứ không "NYC",
> "United States" chứ không "U.S.".

## Thi thử Viết

Content: the 45 writing sentences (`docs/learning_type/writing_questions/`).
Mirrors the real dictation test but the user completes **all 3 sentences — no
early stop**: audio plays (Nghe lại + 🐢 available), no text, user types the
sentence. Grading uses the shared rules above. **Pass = at least 1 of 3
correct.** The result screen shows a per-sentence word diff for all 3, plus
the guidance box.

## Thi thử Speaking

10 questions, **5 What Mean + 5 Yes No**, shuffled order (mirrors the interview
rhythm of Part 12 review interleaved with vocab checks).

- **What Mean items** (temporary MC format until speech practice exists):
  question audio + text, 4 answer choices from the distractor sets (positions
  shuffled), auto-graded.
- **Yes No items**: **audio only — the question text is NOT shown.** The user
  listens and answers with two buttons: **[Yes, officer]** / **[No, officer]**,
  graded against the question's standard answer. Nghe lại allowed (limit 2×);
  no caption button — the real interview has no subtitles. 🐢 available.
- **Result**: score x/10, pass ≥ 8/10. Wrong items are listed with
  "Ôn lại" deep links to the exact card in the What Mean / Yes No sections.
- Yes No feedback notes that the standard answer assumes a typical clean
  record — applicants must answer truthfully about their own case.

## Data pipeline & state

Verified content inventory (all supplied):

| Set | Source | Count | Audio |
|---|---|---|---|
| What Mean | `docs/learning_type/what_mean_questions/N400_what_mean_{en,vi}.md` | 62 | `public/n400-audio/What_mean_questions/{question,answer}/` |
| What Mean MC | `docs/learning_type/what_mean_questions/multiple_choice_distractions` | 62 sets | — |
| Yes No | `docs/learning_type/yes_no_questions/{en,vi}.md` (includes `**Answer:** Yes/No`) | 37 | `public/n400-audio/Yes_no_question/` |
| Writing | `docs/learning_type/writing_questions/N400_writing_{en,vi}.md` | 45 | `public/n400-audio/Writing_questions/` |

- **Build pipeline**: extend the `scripts/n400-build-questions.mjs` pattern with
  parsers for the three new formats, generating typed data modules like
  `questions-data.ts`. Parsers get unit tests (formats differ per file).
- **ID namespacing**: new content uses namespaced ids (`wm-<n>`, `yn-<n>`) so
  known/bookmark/attempt state never collides with civics' numeric ids.
  User-state gains per-section buckets; Tiến độ reads them separately.
- **Audio paths**: ⚠️ the `public/n400-audio/` tree was reorganized into
  subfolders (`civic_question/`, `civic_answer/`, `What_mean_questions/`,
  `Writing_questions/`, `Yes_no_question/`, `State/`), replacing the old
  `question/`/`answer/` layout. Code that builds civics audio URLs
  (`quiz-engine.ts`, `state-data.ts`, `reps-data.ts`, service worker) must be
  re-pointed and verified as the FIRST implementation step, or existing
  flashcards lose audio. The Supabase `n400-audio` storage bucket name is
  unchanged.
- **Slow playback**: not a second recording — `AudioButton` gains an optional
  playback-rate control (`playbackRate ≈ 0.7`; modern browsers preserve pitch).

## Error handling

- Missing audio: `AudioButton` already greys out on 404. Audio-only surfaces
  (Writing, Speaking Yes No items) cannot run without audio — on load
  failure they fall back to showing the caption immediately (degraded but
  usable).
- Daily 5 when everything is mastered: becomes a pure review day (5 đã-thuộc
  cards) rather than an empty state.

## Testing

- **Unit**: content parsers (3 new formats), answer grader (normalization, typo
  tolerance, abbreviation failure, proper-noun warning), per-word diff,
  date-seeded Daily 5 selection (determinism + priority), MC option shuffling
  (correct answer position varies), keyword matcher (What Mean terms → Yes No
  text spans), id namespacing of state buckets.
- **Route/IA**: extend `navigation-ia.test.ts` for sidebar groups and mobile-nav
  invariants.

## Phasing

1. **Audio path re-point + data pipeline** — fix civics audio URLs for the new
   folder layout; parsers + generated data for the 3 new sets.
2. **Câu hỏi What Mean** — Daily 5 + list + Luyện tập MC (shuffled options).
3. **Câu hỏi Yes No** — shared Daily 5 shell, 🐢 slow playback in AudioButton,
   keyword highlighting + definition popover.
4. **Writing section** — grader + dictation practice flow.
5. **Thi thử Viết + Thi thử Speaking** — reuse grader/MC/audio pieces; Thi thử
   page becomes a 3-card picker.
6. **Tổng quan Daily Goals items + Tiến độ stat blocks.**

## Out of scope

- Full spaced-repetition scheduling (Daily 5 priority ordering is enough).
- Speech recognition / recorded speaking answers (Speaking mock is MC +
  Yes/No buttons for now).
- Writing mode for Yes No content.
- A combined cross-section "Daily Mix" quiz (per-section only).
