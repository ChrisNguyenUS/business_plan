# N400 Product Tour — Design Spec

**Date:** 2026-09-23  
**Status:** Design phase  
**Author:** Claude + Product  
**Scope:** First-time user orientation + manual re-trigger

---

## 1. Overview & Goals

### Purpose
Provide new N400 app users with a **guided, encouraging introduction** to all four main tabs (Home / Học tập / Thi thử / Tiến độ) and key features. Explain how each feature supports their exam-prep journey without being intrusive.

### Success Criteria
- **Completion:** ≥80% of first-time users complete the full tour (tracked)
- **Clarity:** User can explain the purpose of each tab after tour
- **Re-engagement:** Users can manually re-trigger tour from settings/help (discoverable)
- **Non-blocking:** Tour doesn't prevent users from using the app mid-way

---

## 2. User Experience Flow

### 2.1 First-Time Trigger
- **When:** On first visit after signup/login, before user lands on Home tab
- **Check:** Server-side flag `tour_completed` in `profiles` table (or `n400_user_state` table)
- **Behavior:** If `false`, show **inline prompt** on Home: *"Welcome! 👋 Want a quick tour of how to use N400?"* with **[Start Tour]** and **[Skip]** buttons
- **Storage:** Set `tour_completed = true` once user finishes (or skips)

### 2.2 Manual Re-trigger
- **Location:** Settings menu or Tài khoản (Account) tab, under "Help" section
- **Button label:** "Replay Product Tour" or "How to use N400?"
- **Behavior:** Clicking opens tour modal, starts from beginning (does NOT require `tour_completed = false`)

### 2.3 Tour Flow Structure (Hybrid)

**Main Flow (Guided):**
1. **Home tab** — hero card, CTA highlight, growth intent
2. **Học tập tab** — practice modes, skill hubs, badges
3. **Thi thử tab** — mock test launch, scoring rules
4. **Tiến độ tab** — readiness tracking, progress overview

**Optional Deep Dives (User-triggered):**
- Each screen has *"Learn more"* link → opens a secondary tooltip/modal with more detail
- Does NOT auto-advance; user chooses to explore or skip

---

## 3. Guided Tour Sequence

### 3.1 Step 1: Home Tab Orientation
**Screen:** Dashboard (default on login)

**Spotlight targets:**
- Hero card (e.g., "Tiếp tục học" CTA) — *Highlight the main call-to-action*
- Weak areas section (if visible) — *Shows areas to focus on*
- Streak/badge display (if visible) — *Your progress is tracked*

**Tooltip content (1-2 sentences each):**
- Hero: "This shows your next recommended action based on your progress."
- Weak areas: "Focus on these topics to boost your readiness score."
- Streaks/badges: "Build streaks and earn badges as you study. Great motivation!"

**User action:** *[Next]* button to proceed to Học tập tab.

---

### 3.2 Step 2: Học tập Tab
**Screen:** Study Hub (module cards, practice selector)

**Spotlight targets:**
- Module cards (e.g., "Civics", "Writing", "Speaking") — *Different study modes*
- Bottom sheet or selector showing practice modes (Daily Practice, Flashcards, Full Mock) — *How to choose*
- Badges display (if visible) — *Achievement system*

**Tooltip content:**
- Modules: "Each topic has multiple ways to study. Choose the method that works for you."
- Practice modes: "Daily Practice for quick drills, Flashcards for deep learning, Full Mock for realistic testing."
- Badges: "Unlock badges by hitting milestones. They show your hard work!"

**User action:** 
- Optional *"See how to practice"* link → Opens mini-modal showing practice workflow (question → answer → feedback → next).
- *[Next]* to proceed to Thi thử tab.

---

### 3.3 Step 3: Thi thử Tab
**Screen:** Mock Test Launch page

**Spotlight targets:**
- Mock test card (Phỏng vấn đầy đủ / Civics / Viết / Speaking options) — *Different test types*
- Start button — *How to launch*
- Scoring rule text (12/20 pass, early stop) — *Know the rules*

**Tooltip content:**
- Test types: "Mock exams simulate the real USCIS interview. Choose by topic or full interview."
- Start: "A mock takes ~15 minutes. You can pause and resume later."
- Scoring: "You need 12 out of 20 correct to pass. We'll stop early if you reach 12 passes or 9 fails."

**User action:**
- *[Next]* to proceed to Tiến độ tab.

---

### 3.4 Step 4: Tiến độ Tab
**Screen:** Progress tracking (Overview + Detail tabs)

**Spotlight targets:**
- Readiness score/gauge (Overview tab) — *Your main metric*
- Readiness percent + estimated days to pass (if visible) — *Pacing guide*
- Section breakdown or practice history (Detail tab) — *Detailed tracking*

**Tooltip content:**
- Readiness score: "This number tells you how ready you are for the real exam, from 0–100."
- Estimated days: "Based on your current pace, we estimate when you'll be ready."
- History: "See your performance by topic so you know what to review."

**User action:**
- *[Finish Tour]* button → Close tour, set `tour_completed = true`, optionally show *"Great! You're all set. Let's get started!"* + [Start Learning] CTA.

---

## 4. Technical Architecture

### 4.1 Data Model

**New table or field:**
```sql
-- Option A: Add to existing profiles table
ALTER TABLE profiles ADD COLUMN tour_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN tour_last_triggered_at TIMESTAMPTZ;

-- Option B: Create dedicated tour state table (if tour grows)
CREATE TABLE n400_tour_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tour_completed BOOLEAN DEFAULT false,
  current_step INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  deep_dives_viewed INT[] DEFAULT ARRAY[]::INT[],
  UNIQUE(user_id)
);
```

**Recommendation:** Start with **Option A** (profiles field) for simplicity. Migrate to Option B only if tour becomes complex (multi-variant tours, A/B testing).

### 4.2 Component Architecture

**Tour system components:**

```
TourProvider (Context)
├── TourOverlay (spotlight + spotlight box)
├── TourTooltip (tooltip positioning + content)
├── TourButtons ([Next], [Skip], [Finish])
└── TourStep (state machine: current step, completed, deep-dives)

Entry points:
- FirstTimePrompt (Home tab, on mount if tour_completed = false)
- ReplayButton (Tài khoản tab, in Help section)
- TourModal (wrapper modal for manual re-trigger)
```

**Files to create:**
- `src/components/tour/TourProvider.tsx` — Context + state machine
- `src/components/tour/TourOverlay.tsx` — Spotlight rendering
- `src/components/tour/TourTooltip.tsx` — Tooltip + positioning
- `src/components/tour/tour-steps.ts` — Step definitions (copy-pasteable config)
- `src/components/tour/useTour.ts` — Hook for consuming components
- `src/app/(n400app)/(home)/page.tsx` — Add FirstTimePrompt (conditional render)
- `src/app/(n400app)/(account)/page.tsx` — Add ReplayButton

---

## 5. Step Definitions (Config-Driven)

Tour steps stored as **step config array** (not hardcoded in components):

```typescript
// src/components/tour/tour-steps.ts
export const TOUR_STEPS = [
  {
    id: 'home-hero',
    screen: 'home',
    target: '[data-tour="hero-card"]', // CSS selector
    title: 'Your Learning Dashboard',
    content: 'This shows your next recommended action based on your progress.',
    position: 'bottom-right',
    deepDive: null, // No secondary tooltip
  },
  {
    id: 'home-weak-areas',
    screen: 'home',
    target: '[data-tour="weak-areas"]',
    title: 'Focus Areas',
    content: 'Focus on these topics to boost your readiness score.',
    position: 'bottom-left',
    deepDive: null,
  },
  {
    id: 'study-modules',
    screen: 'study',
    target: '[data-tour="module-cards"]',
    title: 'Choose Your Study Method',
    content: 'Each topic has multiple ways to study. Choose the method that works for you.',
    position: 'top-center',
    deepDive: {
      title: 'Practice Modes',
      content: 'Daily Practice: quick drills. Flashcards: deep learning. Full Mock: realistic testing.',
      triggerText: 'Learn more about practice modes',
    },
  },
  // ... more steps for Thi thử, Tiến độ
];

export type TourStep = typeof TOUR_STEPS[0];
```

**Benefits:**
- Easy to edit tour copy without touching components
- Easy to add/remove steps
- Easy to A/B test (swap config)
- Easy to reuse in mobile vs desktop

---

## 6. Spotlight & Tooltip Implementation

### 6.1 Spotlight (Highlight Box)
- **Library:** Use existing UI library (or lightweight `react-joyride`-style approach)
- **Behavior:** 
  - Dim entire screen (`opacity: 0.7` or mask)
  - Cut out transparent hole around target element
  - 8px padding around target for breathing room
  - Smooth transition between steps (350ms)

### 6.2 Tooltip
- **Position:** Relative to spotlight, avoid overlapping
- **Content:** Title + brief description + optional deep-dive link
- **Buttons:** *[Skip]*, *[Next]* (or *[Finish]* on last step)
- **Z-index:** Ensure tooltip stays on top of spotlight

### 6.3 Adaptive Positioning
- **Mobile:** Tooltip always below spotlight (limited room)
- **Desktop:** Tooltip positioned dynamically (bottom-right default, adjust if near viewport edge)

---

## 7. First-Time Prompt (Home Tab)

**Visual placement:**
- Render as **card/inline prompt** on Home tab (not intrusive modal)
- Positioned below hero, above weak areas (or as dismissible banner at top)

**Content:**
```
👋 Welcome to N400!
Want a quick tour of how to use the app?

[Start Tour]  [Skip for now]
```

**Behavior:**
- *[Start Tour]* → Fade out card, start TourProvider overlay
- *[Skip for now]* → Hide card, set `tour_completed = true`, let user browse freely
- User can still re-trigger from Account tab

---

## 8. Manual Re-trigger (Account Tab)

**Location:** Account / Tài khoản tab, in Help section (or Settings menu)

**UI:**
```
Help & Support
─────────────
[?] How to use N400  ← Opens product tour
[?] FAQs
[📧] Contact Support
[⚙️] Settings
```

**Behavior:**
- Click → Open TourModal (full-screen modal with tour inside)
- Start from beginning (Step 1, Home tab)
- Modal has close button (X) to exit at any time

---

## 9. State Transitions & Edge Cases

### 9.1 State Transitions

```
Initial (tour_completed = false)
  ├─ User clicks [Start Tour] → Tour Active → Step 1 → ... → Step N → [Finish]
  │  └─ On Finish → tour_completed = true, close overlay
  │
  ├─ User clicks [Skip] → tour_completed = true, no tour shown
  │
  └─ User navigates away mid-tour
     └─ Prompt to confirm: "Exit tour?" [Yes] / [Continue]
     └─ If [Yes] → tour_completed = true

Subsequent visits (tour_completed = true)
  └─ No auto-prompt on Home
     └─ User can click "How to use N400?" in Account → Manual re-trigger

Re-trigger from Account
  └─ Open modal, start Step 1
  └─ Can close at any time without affecting tour_completed flag
```

### 9.2 Edge Cases

| Scenario | Handling |
|----------|----------|
| Target element not found | Skip that step, log warning, move to next |
| User resizes window mid-tour | Recalculate tooltip position on resize |
| User navigates tab mid-tour | Pause tour, show prompt "Continue tour on [tab name]?" |
| User on mobile | Use simplified tooltip (full width, always below spotlight) |
| Deep-dive link clicked | Show secondary tooltip (modal-like) without exiting tour |

---

## 10. Analytics & Tracking

**Events to track:**

```typescript
// Lifecycle
- 'tour_shown' (first-time prompt appears)
- 'tour_started' (user clicks [Start])
- 'tour_skipped' (user clicks [Skip])
- 'tour_step_viewed' (user reaches each step)
- 'tour_deep_dive_opened' (user clicks "Learn more")
- 'tour_finished' (user clicks [Finish])
- 'tour_replayed' (user clicks [Replay] from Account)

// Behavioral
- 'tour_step_time_on_screen' (seconds per step)
- 'tour_exit_early' (user closes mid-tour)
```

**Storage:** Use existing GA4 event tracking (`trackN400Event`) or create new `trackTourEvent` wrapper.

---

## 11. Implementation Plan (High-Level)

### Phase A: Data & Context
1. Add `tour_completed` to `profiles` table (migration)
2. Create TourProvider (Context API + state machine)
3. Create step config (`tour-steps.ts`)

### Phase B: Components
1. TourOverlay + spotlight rendering
2. TourTooltip + positioning logic
3. FirstTimePrompt (Home tab)
4. ReplayButton (Account tab)

### Phase C: Integration
1. Wire FirstTimePrompt to Home layout
2. Wire ReplayButton to Account layout
3. Test on mobile/desktop
4. Add analytics tracking

### Phase D: Polish & Testing
1. Refine spotlight positioning
2. Add transition animations
3. Handle edge cases (target not found, etc.)
4. Smoke test: complete tour end-to-end

---

## 12. Design Decisions & Trade-offs

| Decision | Rationale | Alternative |
|----------|-----------|-------------|
| Hybrid (guided + optional deep-dives) | Balances info density with opt-in depth; users choose | Full tour (might overwhelm) or minimal (users miss features) |
| No character/mascot | Keeps lightweight, on-brand with Civics UI; focuses on content | Character adds personality but increases dev time + file size |
| Config-driven steps | Easy to edit, test, A/B test without code changes | Hardcoded steps (faster initial build, harder to iterate) |
| `tour_completed` in profiles | Simple, single source of truth; future extensibility | Separate table (over-engineered early) |
| First-time prompt on Home (not modal) | Non-blocking, contextual; users can browse while deciding | Modal (more intrusive but higher completion) |

---

## 13. Open Questions

- [ ] Should tour be **mandatory** (blocks app access until completed) or **optional** (skip allowed)?
  - **Recommendation:** Optional (skip allowed). Exam-prep users are high-intent; respect their time.
  
- [ ] Which **library** for spotlight/positioning? 
  - **Options:** `react-joyride` (battle-tested, heavy), custom lightweight build, headless UI library
  - **Recommendation:** Evaluate `react-joyride` first (handles most edge cases), custom build if bundle size is concern.

- [ ] **Mobile-specific** variant needed?
  - **Recommendation:** One tour flow, responsive tooltips (mobile always below spotlight). No separate mobile tour initially.

- [ ] Should **deep-dives** be persisted (track which user explored) for analytics?
  - **Recommendation:** Yes, store in `tour_state` table or GA4 event. Useful for understanding confusion points.

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tour completion rate | ≥80% of starters finish | GA4 'tour_finished' / 'tour_started' |
| Avg time per step | 10-20 seconds | GA4 'tour_step_time_on_screen' |
| Skip rate | ≤20% | GA4 'tour_skipped' / 'tour_shown' |
| Replay rate | ≥5% of users replay | GA4 'tour_replayed' over time |
| Feature adoption post-tour | Measure app usage (e.g., % doing mock tests) 7 days post-tour | Cohort analysis: toured vs non-toured users |

---

## Appendix: Copy (Vietnamese)

**First-Time Prompt:**
```
👋 Chào mừng đến N400!
Muốn có một tour nhanh về cách sử dụng ứng dụng?

[Bắt đầu Tour]  [Bỏ qua]
```

**Step Copy:**

| Step | Title | Content |
|------|-------|---------|
| Home Hero | Bảng điều khiển học tập | Đây là hành động tiếp theo được khuyến nghị dựa trên tiến độ của bạn. |
| Home Weak | Lĩnh vực cần ôn | Tập trung vào những chủ đề này để tăng điểm readiness. |
| Study Modules | Chọn cách học | Mỗi chủ đề có nhiều cách để học. Chọn phương pháp phù hợp với bạn. |
| Study Modes (Deep) | Các chế độ luyện tập | Luyện tập hàng ngày: bài tập nhanh. Flashcards: học sâu. Thi thử: luyện thi thực tế. |
| Mock Test | Bắt đầu thi thử | Bài thi thử mô phỏng phỏng vấn thực tế USCIS. Chọn theo chủ đề hoặc phỏng vấn đầy đủ. |
| Progress | Tiến độ học tập | Con số này cho bạn biết mình sẵn sàng cho kỳ thi thực tế, từ 0–100. |

---

**Status:** ✅ Ready for review  
**Next step:** User review + feedback → writing-plans skill for implementation sequencing
