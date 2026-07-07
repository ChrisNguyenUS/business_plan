// Gamification v2 — Writing badge evaluators (6 badges).
import type { BadgeEvaluator } from '../types';
import { makeCountEvaluator, makePerfectEvaluator } from './section-progress';

const TOTAL = 45;

export const writingEvaluators: Record<string, BadgeEvaluator> = {
  'writing-first': makeCountEvaluator('writing-first', 'writing', 1),
  'writing-10': makeCountEvaluator('writing-10', 'writing', 10),
  'writing-20': makeCountEvaluator('writing-20', 'writing', 20),
  'writing-35': makeCountEvaluator('writing-35', 'writing', 35),
  'writing-45': makeCountEvaluator('writing-45', 'writing', TOTAL),
  'writing-perfect': makePerfectEvaluator('writing-perfect', 'writing', TOTAL),
};
