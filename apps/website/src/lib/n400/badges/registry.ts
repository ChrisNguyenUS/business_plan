// Gamification v2 — Badge evaluator registry.
//
// Maps badge slug → evaluator. Each group module exports a record of
// {slug: evaluator} and we spread them all together. Adding a badge
// later means: (1) INSERT into n400_badges, (2) add an entry here.
//
// The registry is the single source of truth for "what evaluators
// exist." verify-badges.ts cross-checks this against the catalog row
// set so a missing pair (slug seeded but no evaluator, or vice-versa)
// fails loud at build time instead of silently dropping unlocks.

import type { BadgeEvaluator } from './types';
import { streakEvaluators } from './evaluators/streak';
import { civicsEvaluators } from './evaluators/civics';
import { writingEvaluators } from './evaluators/writing';
import { yesnoEvaluators } from './evaluators/yesno';
import { whatmeanEvaluators } from './evaluators/whatmean';
import { comboEvaluators } from './evaluators/combo';
import { practiceEvaluators } from './evaluators/practice';
import { otherEvaluators } from './evaluators/other';
import { secretEvaluators } from './evaluators/secret';

export const BADGE_EVALUATORS: Record<string, BadgeEvaluator> = {
  ...streakEvaluators,   // streak-3, streak-7, streak-14, streak-30, streak-60, streak-100
  ...civicsEvaluators,   // civics-first, civics-10, civics-30, civics-50, civics-100, civics-128
  ...writingEvaluators,  // writing-first, writing-10, writing-20, writing-35, writing-45, writing-perfect
  ...yesnoEvaluators,    // yesno-first, yesno-10, yesno-20, yesno-30, yesno-37, yesno-perfect
  ...whatmeanEvaluators, // whatmean-first, whatmean-15, whatmean-30, whatmean-45, whatmean-62, whatmean-perfect
  ...comboEvaluators,    // combo-starter, combo-explorer, combo-interview-ready, combo-language-champion, combo-interview-master
  ...practiceEvaluators, // practice-exam-ready, practice-future-citizen, practice-high-score, practice-excellence,
                         // practice-perfect-accuracy, practice-perfect-streak, practice-perfect-round, practice-mock-champion
  ...otherEvaluators,    // other-first-practice, other-mock-rookie, other-test-veteran, other-comeback,
                         // other-long-term-memory, other-consistent-performer, other-memory-master, other-ultimate
  ...secretEvaluators,   // secret-early-bird, secret-night-owl, secret-never-give-up, secret-speed-learner, secret-marathon
};
