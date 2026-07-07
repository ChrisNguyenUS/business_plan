// Gamification v2 — What Mean badge evaluators (6 badges).
import type { BadgeEvaluator } from '../types';
import { makeCountEvaluator, makePerfectEvaluator } from './section-progress';

const TOTAL = 62;

export const whatmeanEvaluators: Record<string, BadgeEvaluator> = {
  'whatmean-first': makeCountEvaluator('whatmean-first', 'whatmean', 1),
  'whatmean-15': makeCountEvaluator('whatmean-15', 'whatmean', 15),
  'whatmean-30': makeCountEvaluator('whatmean-30', 'whatmean', 30),
  'whatmean-45': makeCountEvaluator('whatmean-45', 'whatmean', 45),
  'whatmean-62': makeCountEvaluator('whatmean-62', 'whatmean', TOTAL),
  'whatmean-perfect': makePerfectEvaluator('whatmean-perfect', 'whatmean', TOTAL),
};
