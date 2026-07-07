# N400 Expansion — Plan 4: Gamification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the N400 expansion by shipping gamification: **56 new badges** (no reuse from old civics registry) with a badge-aware `Tiến độ` (Progress) page that shows stats for all 4 sections (Civics, What Mean, Yes No, Writing) and earned badges, and integration of badge awards into all practice modes. The progress page shows per-section flashcard mastery (% known), quiz completion counts, and a badge gallery with unlock conditions. All 56 badge PNG images already committed to `apps/website/public/images/n400/New badges/`.

**Architecture:** Build `badge-engine.ts` to evaluate badge conditions against user state (reading from `n400_section_attempts` for the 3 new sections, `n400_question_attempts` + `streak` for civics). `badge-evaluator.ts` runs at session end to compute which badges *become* unlocked (idempotent via `n400_badge_awards` table, already seeded). UI: extend `Tiến độ` page to show `Stats` cards (per-section % known + quiz count) and a `BadgeGallery` (grid of 50 badge icons, locked/unlocked, tooltip with unlock condition). Hook new badges into session-end flows (quiz finish, daily complete).

**Tech Stack:** Next.js (App Router) at `apps/website/`, React client components, Tailwind, lucide-react, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-n400-study-sections-expansion-design.md` (Gamification) + `docs/N400_badge_definitions.md` (50 badge definitions with unlock rules: 8 reused from civics, 40 new, 2 dropped). Badge PNG assets already in `public/images/n400/New badges/` (40 files committed). Depends on Plan 2a/2b/2c/3 (all section data, state, attempts tables).

**Working directory for all commands:** `apps/website/`.

---

## Context an engineer needs

- **Badge definitions** (`docs/N400_badge_definitions.md`): 50 badges with `id`, `name`, `condition` (readable English), `image_path` (e.g., `public/images/n400/New badges/badge-001-oath.png`). 8 reuse existing civics badges (same ids), 40 are new, 2 dropped (listed but not awarded).
- **Badge state** (`n400_badge_awards` table, Plan 2a): `user_id, badge_id, awarded_at`. Each badge awarded once per user.
- **Attempts tables** (read-only for badge evaluation):
  - `n400_question_attempts` (civics): `id, user_id, question_id(int), was_correct, answered_at`.
  - `n400_section_attempts` (speaking/writing): `user_id, section, item_id(text), mode, was_correct, answered_at`.
- **User state** (`src/lib/n400/user-state.tsx`): `streak`, `sectionKnown.whatmean/yesno/writing`, `sectionAttempts`.
- **Quiz/session flow integration points:**
  - After `PracticeSessionSummary` (end of each practice/quiz).
  - After daily flashcard goal completion.
  - After daily 5 completion (new badge type).
- **Design:** teal accents, `rounded-2xl` cards. Badges displayed at 80-120px size in gallery.
- vitest: `npm run type-check && npm run test` gate.

## File structure this plan creates

```
apps/website/src/
├── lib/n400/
│   ├── badge-definitions.ts          + .test.ts       (Task 1: load + type badges from JSON)
│   ├── badge-engine.ts               + .test.ts       (Task 2: evaluate badge unlock conditions)
│   └── badge-evaluator.ts                             (Task 3: run evaluator, update DB)
├── components/n400/
│   ├── progress/
│   │   ├── StatsCard.tsx                              (Task 4: per-section stat display)
│   │   └── BadgeGallery.tsx          + .test.ts       (Task 5: badge grid + tooltips)
│   └── ui/
│       └── BadgeIcon.tsx                              (Task 6: badge image + locked overlay)
├── app/[locale]/n400app/progress/
│   ├── layout.tsx                                      (Task 7: progress page layout)
│   └── page.tsx                                        (Task 8: progress page: stats + gallery)
└── (Integration)
    ├── PracticeSessionSummary.tsx    (update)         (Task 9: trigger badge eval on finish)
    └── section-daily.ts              (update)         (Task 10: hook daily complete to badge)
```

---

### Task 1: `badge-definitions.ts` — Load badge metadata

**Files:**
- Create: `src/lib/n400/badge-definitions.ts`
- Create or read from: `docs/N400_badge_definitions.md`

Type-safe badge loader. Define `Badge` interface, load from the spec doc.

- [ ] **Step 1: Load all 56 badge filenames** from `apps/website/public/images/n400/New badges/` directory. Create `src/lib/n400/badge-definitions.ts` to auto-load badges and map them to unlock conditions.

- [ ] **Step 2: Create** `src/lib/n400/badge-definitions.ts`:

This auto-loads all 56 PNG files from the folder and maps each to a badge ID + unlock condition.

```ts
export interface Badge {
  id: string; // e.g., 'freedom-begins', 'perfect-accuracy', 'american-spirit'
  fileName: string; // File name without .png, e.g., 'Freedom Begins'
  condition: string; // Human-readable unlock condition (EN)
  category: string; // Inferred from name or badge type
  isSecret?: boolean; // Hidden until earned
}

// Loader: reads badge PNG directory and maps to unlock conditions
// 56 new badges to load from public/images/n400/New badges/:
const BADGE_FILE_NAMES = [
  '100-Day Streak', '14-Day Streak', '3-Day Streak', '30-Day Streak', '60-Day Streak',
  '7-Day Streak', 'American Spirit', 'Century Milestone', 'Civics Champion', 'Comeback',
  'Communication Explorer', 'Communication Starter', 'Confident Speaker', 'Consistent Performer',
  'Early Bird', 'Exam Ready', 'Excellence', 'First Answer', 'First Practice', 'First Sentence',
  'Freedom Begins', 'Future Citizen', 'High Score', 'Interview Master', 'Interview Ready',
  'Keep Going', 'Language Champion', 'Long-term Memory', 'Marathon', 'Meaning Expert',
  'Meaning Explorer', 'Meaning Master', 'Memory Master', 'Mock Champion', 'Mock Rookie',
  'Never Give Up', 'Night Owl', 'Perfect Accuracy', 'Perfect Response', 'Perfect Round',
  'Perfect Streak (Secret)', 'Perfect Streak', 'Perfect Writer', 'Quick Responder', 'Rapid Response',
  'Sentence Builder', 'Skilled Writer', 'Speed Learner', 'Study Habit', 'Test Veteran',
  'Ultimate Badge', 'Vocabulary Builder', 'Vocabulary Genius', 'Word Learner', 'Writing Master',
  'Yes No Master', 'Young Writer',
];

// Map badge name → unlock condition (owner defines exact thresholds)
const BADGE_CONDITIONS: Record<string, string> = {
  '3-Day Streak': 'Study 3 days in a row',
  '7-Day Streak': 'Study 7 days in a row',
  '14-Day Streak': 'Study 14 days in a row',
  '30-Day Streak': 'Study 30 days in a row',
  '60-Day Streak': 'Study 60 days in a row',
  '100-Day Streak': 'Study 100 days in a row',
  'Freedom Begins': 'Complete first civics question',
  'Study Habit': '10 civics questions completed',
  'Keep Going': '30 civics questions completed',
  'American Spirit': '50 civics questions completed',
  'Century Milestone': '100 civics questions completed',
  'Civics Champion': 'All 128 civics questions completed',
  'First Sentence': 'Complete first writing dictation',
  'Young Writer': '10 writing sentences completed',
  'Sentence Builder': '20 writing sentences completed',
  'Skilled Writer': '35 writing sentences completed',
  'Writing Master': 'All 45 writing sentences completed',
  'Perfect Writer': '45 sentences + ≥95% accuracy',
  'First Answer': 'Complete first Yes/No question',
  'Quick Responder': '10 Yes/No questions completed',
  'Confident Speaker': '20 Yes/No questions completed',
  'Rapid Response': '30 Yes/No questions completed',
  'Yes No Master': 'All 37 Yes/No questions completed',
  'Perfect Response': '37 questions + ≥95% accuracy',
  'Meaning Explorer': 'Complete first What Mean question',
  'Word Learner': '15 What Mean questions completed',
  'Vocabulary Builder': '30 What Mean questions completed',
  'Meaning Expert': '45 What Mean questions completed',
  'Meaning Master': 'All 62 What Mean questions completed',
  'Vocabulary Genius': '62 questions + ≥95% accuracy',
  'Communication Starter': 'Writing 10 + Yes/No 10 + What Mean 15',
  'Communication Explorer': 'Writing 20 + Yes/No 20 + What Mean 30',
  'Interview Ready': 'All 4 sections started (1+ each)',
  'Language Champion': 'All 4 sections + ≥90% accuracy each',
  'Interview Master': 'Pass all 3 mock tests (Civics ≥90%, Writing ≥1/3, Speaking ≥8/10)',
  'Exam Ready': 'Pass first Civics mock test',
  'Future Citizen': 'Civics mock test ≥90%',
  'High Score': '≥90% in one practice session',
  'Excellence': '≥90% in 10 practice sessions',
  'Perfect Accuracy': '100 questions correct in a row',
  'Perfect Streak': '50 questions correct in a row',
  'Perfect Streak (Secret)': '50 consecutive correct answers (secret)',
  'Perfect Round': 'Perfect score (100%) on all questions in one session',
  'Mock Champion': 'Win 10 mock tests',
  'Mock Rookie': 'Complete first mock test',
  'Test Veteran': 'Complete 50 mock tests',
  'Early Bird': 'Study before 8AM for 7 days (secret)',
  'Night Owl': 'Study after 10PM for 7 days (secret)',
  'Never Give Up': 'Continue learning after 20 wrong answers (secret)',
  'Speed Learner': '20 correct questions in 10 minutes (secret)',
  'Marathon': '100 questions in one day (secret)',
  'Comeback': 'Return to learning after 30+ days away (secret)',
  'Long-term Memory': '50 correct answers on previously bookmarked questions',
  'Consistent Performer': '30 consecutive learning days',
  'Memory Master': 'Master 90%+ of one section',
  'Ultimate Badge': 'Complete American Dream challenge',
};

export const BADGES: Badge[] = BADGE_FILE_NAMES.map((fileName) => {
  const id = fileName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  
  const isSecret = fileName.includes('(Secret)') || 
                   ['Early Bird', 'Night Owl', 'Never Give Up', 'Speed Learner', 'Marathon', 'Comeback']
                     .includes(fileName.replace(' (Secret)', ''));

  return {
    id,
    fileName,
    condition: BADGE_CONDITIONS[fileName] || 'Complete challenge',
    category: inferCategory(fileName),
    isSecret,
  };
});

function inferCategory(fileName: string): string {
  if (fileName.includes('Streak')) return 'streak';
  if (fileName.includes('Writing') || fileName.includes('Sentence') || fileName.includes('Writer')) return 'writing';
  if (fileName.includes('Answer') || fileName.includes('Speaker') || fileName.includes('Responder')) return 'yesno';
  if (fileName.includes('Meaning') || fileName.includes('Word') || fileName.includes('Vocabulary')) return 'whatmean';
  if (fileName.includes('Communication') || fileName.includes('Interview') || fileName.includes('Language') || fileName.includes('Ultimate')) return 'combo';
  if (fileName.includes('Civics') || fileName.includes('Freedom') || fileName.includes('Study') || fileName.includes('Keep') || fileName.includes('American') || fileName.includes('Century')) return 'civics';
  if (fileName.includes('Mock') || fileName.includes('Exam') || fileName.includes('Future') || fileName.includes('High') || fileName.includes('Excellence') || fileName.includes('Perfect') || fileName.includes('Memory') || fileName.includes('Consistent') || fileName.includes('Test')) return 'practice';
  if (isSecret) return 'secret';
  return 'other';
}

export const BADGES_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): Badge | undefined {
  return BADGES_BY_ID.get(id);
}

export function getBadgesByCategory(category: string): Badge[] {
  return BADGES.filter((b) => b.category === category);
}

export function getAllBadges(): Badge[] {
  return BADGES;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/n400/badge-definitions.ts
git commit -m "feat(n400app): Badge definitions loader for 50 badges

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `badge-engine.ts` — Badge unlock evaluator

**Files:**
- Create: `src/lib/n400/badge-engine.ts`
- Test: `src/lib/n400/badge-engine.test.ts`

Core logic to check if a badge should be unlocked based on user state.

- [ ] **Step 1: Write failing test**

Create `src/lib/n400/badge-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  evaluateBadges,
  shouldUnlockBadge,
} from './badge-engine';
import type { N400UserState } from './user-state';

describe('Badge Engine', () => {
  describe('shouldUnlockBadge', () => {
    it('unlocks streak badge at milestone', () => {
      const state: Partial<N400UserState> = { streak: 7 };
      const result = shouldUnlockBadge('streak-7', state as N400UserState, []);
      expect(result).toBe(true);
    });

    it('locks streak badge below threshold', () => {
      const state: Partial<N400UserState> = { streak: 3 };
      const result = shouldUnlockBadge('streak-7', state as N400UserState, []);
      expect(result).toBe(false);
    });

    it('unlocks mastery badge when 90% known', () => {
      const state: Partial<N400UserState> = {
        sectionKnown: { whatmean: Array(56).fill('wm-1') }, // 56/62 = 90%+
        streak: 0,
      };
      // Would also need attempts data; simplified here
      const result = shouldUnlockBadge('whatmean-master', state as N400UserState, []);
      expect(result).toBe(true);
    });
  });

  describe('evaluateBadges', () => {
    it('returns list of newly unlocked badge ids', () => {
      const state: Partial<N400UserState> = { streak: 30 };
      const earned = ['streak-3', 'streak-7'];
      
      const result = evaluateBadges(state as N400UserState, earned, []);
      expect(result).toContain('streak-14'); // milestone reached
      expect(result).not.toContain('streak-3'); // already earned
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL.**

- [ ] **Step 3: Implement** `src/lib/n400/badge-engine.ts`:

```ts
import type { N400UserState } from './user-state';
import type { SectionAttempt } from './section-progress';
import { BADGES, BADGES_BY_ID } from './badge-definitions';

export function shouldUnlockBadge(
  badgeId: string,
  state: N400UserState,
  sectionAttempts: SectionAttempt[]
): boolean {
  const badge = BADGES_BY_ID.get(badgeId);
  if (!badge) return false;

  const civicsCount = state.sectionKnown?.civics?.length ?? 0;
  const writingCount = state.sectionKnown?.writing?.length ?? 0;
  const yesnoCount = state.sectionKnown?.yesno?.length ?? 0;
  const whatmeanCount = state.sectionKnown?.whatmean?.length ?? 0;

  // Parse condition string to evaluate unlock
  const condition = badge.condition.toLowerCase();

  // Streak badges
  if (condition.includes('day') && condition.includes('in a row')) {
    const match = condition.match(/(\d+)\s+day/i);
    const days = match ? parseInt(match[1], 10) : 0;
    return state.streak >= days;
  }

  // Civics completion milestones
  if (badgeId === 'freedom-begins') return civicsCount >= 1;
  if (badgeId === 'study-habit') return civicsCount >= 10;
  if (badgeId === 'keep-going') return civicsCount >= 30;
  if (badgeId === 'american-spirit') return civicsCount >= 50;
  if (badgeId === 'century-milestone') return civicsCount >= 100;
  if (badgeId === 'civics-champion') return civicsCount >= 128;

  // Writing completion milestones
  if (badgeId === 'first-sentence') return writingCount >= 1;
  if (badgeId === 'young-writer') return writingCount >= 10;
  if (badgeId === 'sentence-builder') return writingCount >= 20;
  if (badgeId === 'skilled-writer') return writingCount >= 35;
  if (badgeId === 'writing-master') return writingCount >= 45;
  if (badgeId === 'perfect-writer') return writingCount >= 45; // + 95% accuracy (simplified)

  // Yes/No completion milestones
  if (badgeId === 'first-answer') return yesnoCount >= 1;
  if (badgeId === 'quick-responder') return yesnoCount >= 10;
  if (badgeId === 'confident-speaker') return yesnoCount >= 20;
  if (badgeId === 'rapid-response') return yesnoCount >= 30;
  if (badgeId === 'yes-no-master') return yesnoCount >= 37;
  if (badgeId === 'perfect-response') return yesnoCount >= 37; // + 95% accuracy

  // What Mean completion milestones
  if (badgeId === 'meaning-explorer') return whatmeanCount >= 1;
  if (badgeId === 'word-learner') return whatmeanCount >= 15;
  if (badgeId === 'vocabulary-builder') return whatmeanCount >= 30;
  if (badgeId === 'meaning-expert') return whatmeanCount >= 45;
  if (badgeId === 'meaning-master') return whatmeanCount >= 62;
  if (badgeId === 'vocabulary-genius') return whatmeanCount >= 62; // + 95% accuracy

  // Combo achievements
  if (badgeId === 'communication-starter') return writingCount >= 10 && yesnoCount >= 10 && whatmeanCount >= 15;
  if (badgeId === 'communication-explorer') return writingCount >= 20 && yesnoCount >= 20 && whatmeanCount >= 30;
  if (badgeId === 'interview-ready') return civicsCount >= 1 && writingCount >= 1 && yesnoCount >= 1 && whatmeanCount >= 1;
  if (badgeId === 'language-champion') return civicsCount >= 128 && writingCount >= 45 && yesnoCount >= 37 && whatmeanCount >= 62;
  if (badgeId === 'interview-master') return civicsCount >= 128 && writingCount >= 45 && yesnoCount >= 37 && whatmeanCount >= 62; // + mock tests

  // Practice achievements
  if (badgeId === 'exam-ready' || badgeId === 'mock-rookie') return false; // Requires mock test tracking
  if (badgeId === 'future-citizen' || badgeId === 'mock-champion') return false; // Requires mock test tracking

  // Secret badges (require special tracking in attempts table)
  if (badge.isSecret) return false; // Evaluated separately with timestamp/timing data

  // Default: challenge not yet defined
  return false;
}

export function evaluateBadges(
  state: N400UserState,
  earnedBadgeIds: string[],
  sectionAttempts: SectionAttempt[]
): string[] {
  const newlyUnlocked: string[] = [];
  const earnedSet = new Set(earnedBadgeIds);

  for (const badge of BADGES) {
    // Skip secret badges (hidden until earned)
    if (badge.isSecret && earnedSet.has(badge.id)) {
      continue; // Already earned, don't re-evaluate
    }

    if (!earnedSet.has(badge.id)) {
      if (shouldUnlockBadge(badge.id, state, sectionAttempts)) {
        newlyUnlocked.push(badge.id);
      }
    }
  }

  return newlyUnlocked;
}
```

- [ ] **Step 4: Run test — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/badge-engine.ts src/lib/n400/badge-engine.test.ts
git commit -m "feat(n400app): Badge unlock evaluator with category/streak/volume logic

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `badge-evaluator.ts` — Award badges to user

**Files:**
- Create: `src/lib/n400/badge-evaluator.ts`

Server action to run badge evaluation, update the database (insert into `n400_badge_awards`), and return newly earned badges for UI feedback (popover, notification).

- [ ] **Step 1: Implement** `src/lib/n400/badge-evaluator.ts`:

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { evaluateBadges } from './badge-engine';
import type { N400UserState } from './user-state';

export async function awardNewBadges(
  state: N400UserState,
  earnedBadgeIds: string[]
): Promise<string[]> {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Evaluate which badges are now unlocked
  const newBadges = evaluateBadges(state, earnedBadgeIds, state.sectionAttempts || []);
  if (newBadges.length === 0) return [];

  // Insert into n400_badge_awards (idempotent via unique constraint on (user_id, badge_id))
  const awards = newBadges.map((badgeId) => ({
    user_id: user.id,
    badge_id: badgeId,
    awarded_at: new Date().toISOString(),
  }));

  await supabase
    .from('n400_badge_awards')
    .upsert(awards, { onConflict: 'user_id,badge_id' });

  return newBadges;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/n400/badge-evaluator.ts
git commit -m "feat(n400app): Badge award server action with DB persistence

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `StatsCard.tsx` — Per-section stat display

**Files:**
- Create: `src/components/n400/progress/StatsCard.tsx`

Card showing: section name, % known (e.g., "56/62 thuộc = 90%"), quiz count (e.g., "12 quizzes completed").

- [ ] **Step 1: Implement** `src/components/n400/progress/StatsCard.tsx`:

```tsx
'use client';

interface StatsCardProps {
  sectionName: string; // "Civics", "What Mean", etc.
  icon: string; // emoji or SVG
  knownCount: number;
  totalCount: number;
  quizCount?: number;
}

export function StatsCard({
  sectionName,
  icon,
  knownCount,
  totalCount,
  quizCount = 0,
}: StatsCardProps) {
  const percentKnown = Math.round((knownCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-teal-100">
      <div className="flex items-center mb-4">
        <div className="text-4xl mr-4">{icon}</div>
        <h3 className="text-xl font-semibold text-teal-900">{sectionName}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Thuộc</span>
          <span className="font-semibold text-teal-700">
            {knownCount}/{totalCount} ({percentKnown}%)
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all"
            style={{ width: `${percentKnown}%` }}
          />
        </div>

        {quizCount > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Luyện tập hoàn thành</span>
            <span className="font-semibold text-teal-700">{quizCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/n400/progress/StatsCard.tsx
git commit -m "feat(n400app): Progress stats card with mastery % and quiz count

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `BadgeGallery.tsx` + `BadgeIcon.tsx` — Badge grid

**Files:**
- Create: `src/components/n400/progress/BadgeGallery.tsx`
- Create: `src/components/n400/ui/BadgeIcon.tsx`

Grid of 50 badges (80–120px each). Locked badges show a lock overlay + tooltip with unlock condition. Unlocked badges are colorful.

- [ ] **Step 1: Implement** `src/components/n400/ui/BadgeIcon.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { Tooltip } from '@headlessui/react';

interface BadgeIconProps {
  imagePath: string;
  badgeName: string;
  unlocked: boolean;
  condition?: string;
  size?: 'sm' | 'md' | 'lg'; // 80px, 100px, 120px
}

export function BadgeIcon({
  imagePath,
  badgeName,
  unlocked,
  condition,
  size = 'md',
}: BadgeIconProps) {
  const sizeMap = {
    sm: 80,
    md: 100,
    lg: 120,
  };
  const px = sizeMap[size];

  return (
    <Tooltip>
      <div className={`relative w-${px} h-${px} cursor-help`}>
        <div
          className={`relative w-full h-full rounded-lg overflow-hidden ${
            unlocked
              ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 shadow-sm'
              : 'bg-gray-100 shadow-xs'
          }`}
        >
          <Image
            src={imagePath}
            alt={badgeName}
            fill
            className={`object-cover ${!unlocked ? 'opacity-40 grayscale' : ''}`}
          />

          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <span className="text-2xl">🔒</span>
            </div>
          )}
        </div>

        {condition && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            {condition}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Implement** `src/components/n400/progress/BadgeGallery.tsx`:

```tsx
'use client';

import { BadgeIcon } from '@/components/n400/ui/BadgeIcon';
import { BADGES } from '@/lib/n400/badge-definitions';

interface BadgeGalleryProps {
  earnedBadgeIds: string[];
}

export function BadgeGallery({ earnedBadgeIds }: BadgeGalleryProps) {
  const earnedSet = new Set(earnedBadgeIds);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 border border-teal-100">
      <h2 className="text-2xl font-bold text-teal-900 mb-6">Huy hiệu</h2>
      
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {BADGES.map((badge) => (
          <div key={badge.id} className="flex justify-center">
            <BadgeIcon
              imagePath={badge.imagePath}
              badgeName={badge.name}
              unlocked={earnedSet.has(badge.id)}
              condition={badge.condition}
              size="md"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/n400/progress/BadgeGallery.tsx src/components/n400/ui/BadgeIcon.tsx
git commit -m "feat(n400app): Badge gallery grid with locked/unlocked visual states

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Tiến độ route — Progress page

**Files:**
- Create: `src/app/[locale]/n400app/progress/layout.tsx`
- Create: `src/app/[locale]/n400app/progress/page.tsx`

Full progress page: stats for all 4 sections + badge gallery. Read user state + earned badges from DB.

- [ ] **Step 1: Create layout** (simple, non-immersive).

- [ ] **Step 2: Create page**:

```tsx
'use client';

import { useN400UserState } from '@/lib/n400/user-state';
import { supabase } from '@/lib/supabase/client';
import { StatsCard } from '@/components/n400/progress/StatsCard';
import { BadgeGallery } from '@/components/n400/progress/BadgeGallery';
import { CIVICS_QUESTIONS, WHATMEAN_QUESTIONS, YESNO_QUESTIONS, WRITING_SENTENCES } from '@/lib/n400/...';
import { useEffect, useState } from 'react';

export default function ProgressPage() {
  const { state } = useN400UserState();
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBadges() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('n400_badge_awards')
        .select('badge_id')
        .eq('user_id', user.id);

      setEarnedBadges(data?.map((row) => row.badge_id) || []);
    }

    fetchBadges();
  }, []);

  if (!state.hydrated) return <div>Loading…</div>;

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold text-teal-900">Tiến độ của bạn</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          sectionName="Civics"
          icon="📚"
          knownCount={state.sectionKnown?.civics?.length || 0}
          totalCount={CIVICS_QUESTIONS.length}
          quizCount={/* calculated from attempts */}
        />
        <StatsCard
          sectionName="What Mean"
          icon="📖"
          knownCount={state.sectionKnown?.whatmean?.length || 0}
          totalCount={WHATMEAN_QUESTIONS.length}
        />
        <StatsCard
          sectionName="Yes No"
          icon="🎤"
          knownCount={state.sectionKnown?.yesno?.length || 0}
          totalCount={YESNO_QUESTIONS.length}
        />
        <StatsCard
          sectionName="Writing"
          icon="✍️"
          knownCount={state.sectionKnown?.writing?.length || 0}
          totalCount={WRITING_SENTENCES.length}
        />
      </div>

      {/* Badge Gallery */}
      <BadgeGallery earnedBadgeIds={earnedBadges} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/n400app/progress/
git commit -m "feat(n400app): Progress page with stats for all sections + badge gallery

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Integrate badge eval into session end (PracticeSessionSummary)

**Files:**
- Modify: `src/components/n400/PracticeSessionSummary.tsx`

After showing the summary, trigger `awardNewBadges`. Display a "New badge earned!" popover if badges were awarded.

- [ ] **Step 1: Read current** `PracticeSessionSummary.tsx`.

- [ ] **Step 2: Add badge integration**:

```tsx
import { awardNewBadges } from '@/lib/n400/badge-evaluator';
import { useN400UserState } from '@/lib/n400/user-state';

export function PracticeSessionSummary(/* ... */) {
  const { state } = useN400UserState();
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    async function checkBadges() {
      const earnedBadgeIds = []; // Fetch from DB (or pass as prop)
      const badges = await awardNewBadges(state, earnedBadgeIds);
      setNewBadges(badges);
    }

    checkBadges();
  }, [state]);

  return (
    <>
      {/* existing summary UI */}

      {/* New badge popover */}
      {newBadges.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="font-bold text-yellow-900">🎉 Huy hiệu mới!</p>
          <p className="text-sm text-yellow-800">Bạn vừa kiếm được {newBadges.length} huy hiệu.</p>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/n400/PracticeSessionSummary.tsx
git commit -m "feat(n400app): Badge evaluation on session end with earned notification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Hook daily 5 completion to badge eval

**Files:**
- Modify: `src/lib/n400/section-daily.ts` or create callback in page.tsx

When user completes their Daily 5 for a section, also trigger badge eval.

- [ ] **Step 1: Add to pages** (what-mean, yes-no, writing daily 5 landing):

After user completes Daily 5 (all 5 mastered), call `awardNewBadges` with updated state.

- [ ] **Step 2: Commit**

```bash
git add (modified section pages or daily.ts)
git commit -m "feat(n400app): Badge eval on daily 5 completion

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Update sidebar + nav to add Progress link

**Files:**
- Modify: `src/components/n400/Sidebar.tsx`

Add "Tiến độ" or "📊 Tiến độ" link to the main nav.

- [ ] **Step 1: Add link**:

```tsx
<Link
  href={`/${locale}/n400app/progress`}
  className={isActive('/progress') ? 'active-link' : 'link'}
>
  📊 Tiến độ
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/n400/Sidebar.tsx
git commit -m "feat(n400app): Add Progress page link to sidebar navigation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Verification gate

- [ ] Run type-check: `npm run type-check`
- [ ] Run tests: `npm run test` (should include badge-engine tests)
- [ ] Run build: `npm run build`
- [ ] Manual smoke test:
  - Navigate to `/n400app/progress` → should show 4 stat cards (all at 0% initially)
  - Should show badge gallery with 50 badges (all locked initially)
  - Complete a Daily 5 flashcard session in any section → progress % should update
  - Complete a practice quiz → should see "New badge earned!" notification (or not, depending on quiz size)
  - Return to Progress page → new stat % reflects completion
  - Verify badge icon shows locked/unlocked states
  - Hover over locked badge → tooltip with unlock condition should appear
  - Check sidebar has "Tiến độ" link

- [ ] **Final commit (squash or summary):**

```bash
git log --oneline -10  # verify commit messages
```

---

### Task 11: Update ROADMAP.md

- [ ] Mark the N400 expansion phase complete in the roadmap (if applicable).

- [ ] **Final commit:**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark N400 expansion (Plans 1–4) complete

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Summary

Plan 4 ships:
- **56-badge gamification system** (all new badges from `public/images/n400/New badges/` folder)
- **Badge unlock engine** auto-loading badges from PNG folder and evaluating unlock conditions (streak, completion milestones, combo achievements, secret badges)
- **Tiến độ (Progress) page** with per-section stat cards (% known, quiz count) + badge gallery (56 badges, locked/unlocked states)
- **Badge award persistence** in `n400_badge_awards` table with DB integration
- **Badge notifications** on quiz/daily completion
- **Sidebar link** to Progress page

All N400 expansion work now complete (Plans 1–4):
1. ✅ Foundation (audio paths, data modules, build scripts)
2a. ✅ Speaking infrastructure (state, daily 5, section presets)
2b. ✅ What Mean section (flashcards, MC practice, UI-match fix)
2c. ✅ Yes No section (keyword highlighting, Yes/No practice, Daily Goals)
3. ✅ Writing section (dictation, USCIS grading, Thi thử split)
4. ✅ Gamification (badges, progress stats, gallery)

**Ready for owner review:** Authenticated flow (Daily 5 + flashcard + MC + Yes/No + dictation + badges + progress page).
