// Gamification v2 — Secret badge evaluators (5 badges). Hidden (title +
// description) in the UI until earned — see BadgeGallery.tsx.
//
// Time-of-day badges (early-bird/night-owl) compare answered_at's UTC hour,
// not the learner's local time — the schema has no stored user timezone.
// A pragmatic simplification, documented rather than silently wrong.

import type { BadgeEvaluator } from '../types';
import { loadAttemptTimeline, type TimelineEntry } from './timeline';

const TEN_MINUTES_MS = 10 * 60 * 1000;

function distinctUtcDatesWithHourMatch(entries: TimelineEntry[], matchesHour: (h: number) => boolean): number {
  const dates = new Set<string>();
  for (const e of entries) {
    const d = new Date(e.at);
    if (matchesHour(d.getUTCHours())) dates.add(d.toISOString().slice(0, 10));
  }
  return dates.size;
}

const secretEarlyBird: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  const days = distinctUtcDatesWithHourMatch(timeline, (h) => h < 8);
  if (days < 7) return null;
  return { slug: 'secret-early-bird', metadata: { days }, triggerAttemptId: ctx.attemptId };
};

const secretNightOwl: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  const days = distinctUtcDatesWithHourMatch(timeline, (h) => h >= 22);
  if (days < 7) return null;
  return { slug: 'secret-night-owl', metadata: { days }, triggerAttemptId: ctx.attemptId };
};

const secretNeverGiveUp: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  let wrongSeen = 0;
  let twentiethWrongIndex = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (!timeline[i].wasCorrect) {
      wrongSeen += 1;
      if (wrongSeen === 20) {
        twentiethWrongIndex = i;
        break;
      }
    }
  }
  if (twentiethWrongIndex === -1) return null;
  const keptGoing = timeline.length > twentiethWrongIndex + 1;
  if (!keptGoing) return null;
  return { slug: 'secret-never-give-up', metadata: {}, triggerAttemptId: ctx.attemptId };
};

const secretSpeedLearner: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  // Sliding window over the full chronological timeline: does any 10-minute
  // span contain >=20 correct answers? Wrong answers inside the window don't
  // disqualify it, they're just not counted.
  let left = 0;
  let correctInWindow = 0;
  let best = 0;
  for (let right = 0; right < timeline.length; right++) {
    if (timeline[right].wasCorrect) correctInWindow += 1;
    while (new Date(timeline[right].at).getTime() - new Date(timeline[left].at).getTime() > TEN_MINUTES_MS) {
      if (timeline[left].wasCorrect) correctInWindow -= 1;
      left += 1;
    }
    best = Math.max(best, correctInWindow);
  }
  if (best < 20) return null;
  return { slug: 'secret-speed-learner', metadata: { best }, triggerAttemptId: ctx.attemptId };
};

const secretMarathon: BadgeEvaluator = async (userId, ctx, supabase) => {
  const timeline = await loadAttemptTimeline(userId, ctx, supabase);
  const perDay = new Map<string, number>();
  for (const e of timeline) {
    const day = new Date(e.at).toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const max = Math.max(0, ...perDay.values());
  if (max < 100) return null;
  return { slug: 'secret-marathon', metadata: { max }, triggerAttemptId: ctx.attemptId };
};

export const secretEvaluators: Record<string, BadgeEvaluator> = {
  'secret-early-bird': secretEarlyBird,
  'secret-night-owl': secretNightOwl,
  'secret-never-give-up': secretNeverGiveUp,
  'secret-speed-learner': secretSpeedLearner,
  'secret-marathon': secretMarathon,
};
