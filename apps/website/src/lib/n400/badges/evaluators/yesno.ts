// Gamification v2 — Yes/No badge evaluators (6 badges).
import type { BadgeEvaluator } from '../types';
import { makeCountEvaluator, makePerfectEvaluator } from './section-progress';

const TOTAL = 37;

export const yesnoEvaluators: Record<string, BadgeEvaluator> = {
  'yesno-first': makeCountEvaluator('yesno-first', 'yesno', 1),
  'yesno-10': makeCountEvaluator('yesno-10', 'yesno', 10),
  'yesno-20': makeCountEvaluator('yesno-20', 'yesno', 20),
  'yesno-30': makeCountEvaluator('yesno-30', 'yesno', 30),
  'yesno-37': makeCountEvaluator('yesno-37', 'yesno', TOTAL),
  'yesno-perfect': makePerfectEvaluator('yesno-perfect', 'yesno', TOTAL),
};
