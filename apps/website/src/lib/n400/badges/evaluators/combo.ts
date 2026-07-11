// Gamification v2 — Cross-section combo badge evaluators (5 badges).

import type { BadgeEvaluator } from '../types';
import { distinctCivicsAnswered } from './civics';
import {
  accuracy,
  civicsLastAttemptMap,
  passedMockCounts,
  sectionCounts,
  CIVICS_TOTAL,
  SECTION_TOTAL,
} from './mock-shared';

const combosStarter: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { writing, yesno, whatmean } = await sectionCounts(userId, ctx, supabase);
  if (writing.size >= 10 && yesno.size >= 10 && whatmean.size >= 15) {
    return { slug: 'combo-starter', metadata: {}, triggerAttemptId: ctx.attemptId };
  }
  return null;
};

const combosExplorer: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { writing, yesno, whatmean } = await sectionCounts(userId, ctx, supabase);
  if (writing.size >= 20 && yesno.size >= 20 && whatmean.size >= 30) {
    return { slug: 'combo-explorer', metadata: {}, triggerAttemptId: ctx.attemptId };
  }
  return null;
};

const comboInterviewReady: BadgeEvaluator = async (userId, ctx, supabase) => {
  const [civics, { writing, yesno, whatmean }] = await Promise.all([
    distinctCivicsAnswered(userId, ctx, supabase),
    sectionCounts(userId, ctx, supabase),
  ]);
  if (civics >= 1 && writing.size >= 1 && yesno.size >= 1 && whatmean.size >= 1) {
    return { slug: 'combo-interview-ready', metadata: {}, triggerAttemptId: ctx.attemptId };
  }
  return null;
};

const comboLanguageChampion: BadgeEvaluator = async (userId, ctx, supabase) => {
  const [civicsMap, { writing, yesno, whatmean }] = await Promise.all([
    civicsLastAttemptMap(userId, ctx, supabase),
    sectionCounts(userId, ctx, supabase),
  ]);
  const ok =
    accuracy(civicsMap, CIVICS_TOTAL) >= 0.9 &&
    accuracy(writing, SECTION_TOTAL.writing) >= 0.9 &&
    accuracy(yesno, SECTION_TOTAL.yesno) >= 0.9 &&
    accuracy(whatmean, SECTION_TOTAL.whatmean) >= 0.9;
  if (!ok) return null;
  return { slug: 'combo-language-champion', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const comboInterviewMaster: BadgeEvaluator = async (userId, ctx, supabase) => {
  const { civics, writing, speaking } = await passedMockCounts(userId, ctx, supabase);
  if (civics >= 1 && writing >= 1 && speaking >= 1) {
    return { slug: 'combo-interview-master', metadata: {}, triggerAttemptId: ctx.attemptId };
  }
  return null;
};

export const comboEvaluators: Record<string, BadgeEvaluator> = {
  'combo-starter': combosStarter,
  'combo-explorer': combosExplorer,
  'combo-interview-ready': comboInterviewReady,
  'combo-language-champion': comboLanguageChampion,
  'combo-interview-master': comboInterviewMaster,
};
