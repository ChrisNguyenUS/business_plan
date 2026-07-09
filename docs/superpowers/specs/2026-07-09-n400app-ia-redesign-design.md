# N400app Information Architecture Redesign — Design Spec

**Date:** 2026-07-09
**App:** `apps/website` — routes under `/[locale]/n400app`
**Status:** Approved direction (4-tab skill-first IA); pending final spec review

## 1. Goal

Reorganize N400app navigation around **4 top-level areas** — Home, Study, Mock Exam, Progress — with a skill-first Study hub. Users pick a *skill* first (Civics, What Mean, Yes/No, Writing), then a *learning method* (Continue, Study Cards, Practice, Weak Areas). Learning methods are no longer top-level destinations.

This is an **evolution, not a redesign**: sidebar shell, header, profile chip, colors, typography, rounded cards, soft shadows, and the existing Practice quiz screen and Flashcard screen are kept as-is. Only navigation, hub/landing pages, and the practice-mode picker change.

## 2. Problems being fixed

1. **Mobile bottom nav is broken IA**: it currently exposes only Tổng quan / Luyện tập / Flashcards / Thi thử — there is *no mobile path* to What Mean, Yes/No, Writing, or Progress.
2. **Civics is structured differently from other skills**: Civics has separate top-level Practice and Flashcards pages, while What Mean / Yes-No are self-contained hub pages. Two parallel models.
3. **Progress is split** across two nav items: `statistic` (Tiến độ học tập) and `progress` (Huy hiệu & Thành tích).
4. **Sidebar mixes hierarchy levels**: skill groups and feature pages sit side by side.

## 3. Navigation

### 3.1 Top-level structure (both platforms share one mental model)

```
🏠 Home        /n400app                 (dashboard — unchanged)
📚 Study       /n400app/study           (skill picker hub; skills below)
   ├── Civics      /n400app/study/civics       (NEW hub page)
   ├── What Mean   /n400app/speaking/what-mean (existing route, landing rebuilt as hub)
   ├── Yes/No      /n400app/speaking/yes-no    (existing route, landing rebuilt as hub)
   └── Writing     /n400app/writing            (existing route, landing rebuilt as hub)
🎯 Mock Exam   /n400app/mock-test       (3 existing tests + NEW Full Interview)
📈 Progress    /n400app/statistic + /n400app/progress (merged into one nav item with tabs)
```

Existing URLs (`/practice`, `/flashcards`, `/speaking/*`, `/writing`, `/mock-test/*`, `/statistic`, `/progress`) are **kept stable** — no redirects needed. New routes: `/study`, `/study/civics`, `/mock-test/full`.

### 3.2 Desktop sidebar (`Sidebar.tsx`)

```
Tổng quan
HỌC TẬP
  🇺🇸 Civics
  💬 What Mean
  📋 Yes / No
  ✍️ Writing
Thi thử
Tiến độ          ← single item (statistic + achievements merged, see §7)
── utilities: Chế độ tối, Cài đặt, Đăng xuất (unchanged)
```

Removed from sidebar: separate "Luyện tập" and "Flashcards" items (now methods inside the Civics hub), separate "Huy hiệu & Thành tích" item (now a tab under Tiến độ).

### 3.3 Mobile bottom nav (`MobileNav`)

4 tabs: **Home · Học · Thi thử · Tiến độ**. "Học" opens `/study` (skill picker with 4 cards, styled like the existing skill-card screen). This restores mobile access to all skills and Progress.

Accepted trade-off: reaching Civics practice on mobile costs one extra tap; mitigated by the "Tiếp tục học" card on Home.

## 4. Skill hub — shared module

One config-driven component set, reused by all 4 skills (per the "Speaking/Writing must match Civics UI" rule). Vertical card stack, generous whitespace, progressive disclosure — **one decision per screen**.

### 4.1 Hub layout (top → bottom, visual hierarchy in this order)

1. **Header**: skill icon + name, question count, one-line tagline, illustration.
2. **Continue Learning ⭐ (largest card, primary CTA)** — all 4 skills.
   - Progress ring (`104/128`, `81%`), progress bar, subtitle "Bạn đang ở câu #105".
   - Button `Tiếp tục →`; if never studied: `Bắt đầu học →`.
   - Resumes the learner's last position in the skill's card sequence.
3. **Study Cards (Thẻ học)** — Civics, What Mean, Yes/No only (NOT Writing).
   - Never titled "Flashcards". Subtitle: "Xem và ôn lại toàn bộ câu hỏi."
   - Count pill (`128 thẻ`) + filter chips: **Tất cả · Đang học · Đã thuộc · ⭐ Đã lưu**.
   - Button `Xem thẻ →` opens the **existing Flashcard screen unchanged**, with the chosen chip pre-applied as filter. Saved is *only* a filter here — no Saved page, menu item, or card anywhere.
4. **Practice (Luyện tập)** — all 4 skills.
   - Single clean card, no modes shown inline. Subtitle per skill (MC quiz for Civics/What Mean/Yes-No; "Nghe và gõ lại câu" dictation for Writing).
   - Button `Bắt đầu luyện tập →` opens a **Bottom Sheet** (see §5). Never navigates to a mode-picker page.
5. **Weak Areas (Điểm yếu)** — **Civics only** (only Civics has category data).
   - Shows weakest topic from `recommendWeakCategory`: topic name, question count, accuracy %, small progress bar, `Luyện tập →` starts a weak-topic session (existing quiz-engine capability).

### 4.2 Per-skill feature matrix

| Skill | Continue | Study Cards | Practice | Weak Areas |
|---|---|---|---|---|
| Civics (128) | ✅ | ✅ | ✅ MC quiz | ✅ |
| What Mean (62) | ✅ | ✅ | ✅ MC quiz | — |
| Yes/No (37) | ✅ | ✅ | ✅ MC quiz | — |
| Writing (45) | ✅ | — | ✅ Dictation | — |

Writing hub keeps its always-on USCIS writing-rules guidance box. The dictation quiz screen itself follows the approved mock (progress bar, Nghe / Đọc chậm 0.8x / Nghe 2 lần controls, typing area, Kiểm tra + Chưa nghe được buttons, side panel with rules) — evolve the existing `DictationQuiz`, don't rebuild.

## 5. Practice Modes bottom sheet (shared component)

Floating bottom sheet (overlay, dismissible), title "Chế độ luyện tập" + "Chọn chế độ phù hợp với thời gian và mục tiêu của bạn." Four mode cards, each with icon, question count, estimated duration, one-line description:

| Mode | Civics | What Mean | Yes/No | Writing | Duration copy |
|---|---|---|---|---|---|
| ⚡ Ôn nhanh (Quick Review) | 5 | 5 | 5 | 5 | ≈3 phút |
| ⭐ Luyện hằng ngày (Daily, badge HOT, recommended) | 10 | 10 | 10 | 10 | ≈5 phút |
| 🎯 Thử thách (Challenge) | 20 | 20 | 20 | 20 | ≈10 phút |
| 🏆 Ôn toàn bộ (Master Review) | 128 | 62 | 37 | 45 | scaled (Civics ≈30–40 phút) |

- Selecting a mode starts the **existing** quiz flow (Civics practice screen / SectionMCQuiz / DictationQuiz) — those screens are not redesigned.
- This replaces the current inline `PracticeSessionPicker` grid on section landings and the Civics practice landing. Civics presets change from 5/15/40/128 to 5/10/20/128; "Daily" uses recommended-question selection (existing daily/recommendation logic).
- Duplicate practice entry points are removed: the Civics `/practice` page becomes quiz-only (entered via hub or deep link with a mode); its landing picker goes away.

## 6. Mock Exam

Keep the 3 existing tests. Add a 4th card, **Phỏng vấn đầy đủ (Full Interview)** at `/mock-test/full` — recommended/featured card:

- Sequential run of existing engines: **Civics (20 câu, đậu 12) → Speaking (10 câu MC: 5 What Mean + 5 Yes/No, đậu 8) → Writing (3 câu dictation, đậu 1)**.
- No speech-to-text anywhere — Speaking remains multiple-choice.
- Between parts: short transition screen ("Phần 2/3: Speaking").
- Final summary screen: per-part pass/fail + overall verdict (pass = all 3 parts pass), retake buttons.
- Reuses the three existing test implementations (civics/speaking/viet); the new work is the orchestration shell + summary.

## 7. Progress (merged)

One nav item **Tiến độ**. Both existing pages stay at their URLs and get a shared tab bar at the top:

- **Thống kê** (`/statistic`) — current statistics page (totals, per-skill progress, study calendar, performance chart, weak topics). Unchanged content.
- **Thành tích** (`/progress`) — current badges/achievements page. Unchanged content.

"Weak Topics" remains a section inside Thống kê (not a separate tab). **History** (centralized mock-exam history) is explicitly deferred to a later phase; Full Interview results should still be recorded so History has data later.

## 8. Removals / cleanup

- Saved/bookmark page (`/bookmark` stub) and any Saved nav entries → delete; Saved lives only as a Study Cards filter chip.
- Sidebar groups CIVICS/SPEAKING/WRITING → replaced by the HỌC TẬP group.
- Inline practice-mode grids on landings → replaced by the bottom sheet.
- Update `navigation-ia.test.ts` / `mobile-layout.test.ts` to the new IA.

## 9. Data & state notes

- **Continue Learning** needs a per-skill "last position" (question index) persisted in `useN400UserState`. Civics can seed from existing seen-state; sections from `deriveSectionSeen`.
- Study Cards chips map to existing flashcard filters (All / Chưa thuộc → Đang học / Đã thuộc / Saved) — the flashcard screen already supports these; the hub only deep-links with the filter preselected.
- Weak Areas card and weak-topic sessions reuse `recommendWeakCategory` + existing quiz-engine selection.
- Home dashboard content unchanged; its CTA links update to the new hub targets.

## 10. Out of scope

- Any restyle of the Practice quiz screen, Flashcard screen, Home dashboard, or app visual language.
- Speech-to-text / voice grading.
- Progress "History" tab.
- Weak Areas for What Mean / Yes-No / Writing (no topic data).

## 11. Suggested delivery slices (for the implementation plan)

1. Navigation shell: Sidebar + MobileNav + `/study` skill picker.
2. Shared hub module (cards + bottom sheet) + Civics hub at `/study/civics`.
3. Rebuild What Mean / Yes-No / Writing landings on the hub module; retire inline pickers; Saved cleanup.
4. Progress merge (tab bar over statistic + achievements).
5. Full Interview orchestration + summary screen.
6. Test updates (navigation-ia, mobile-layout) + roadmap checkbox.
