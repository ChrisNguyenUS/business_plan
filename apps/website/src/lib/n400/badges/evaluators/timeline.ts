// Gamification v2 — merged cross-section attempt timeline.
//
// "N correct in a row" / "N questions in one day" / "study before 8AM"
// style badges (practice.ts perfect-accuracy/perfect-streak, secret.ts
// never-give-up/speed-learner/marathon/early-bird/night-owl) all need a
// single chronological stream of every answer the user has ever given,
// across civics (n400_question_attempts) and the 3 sections
// (n400_section_attempts). Factored out per Rule of Three.
//
// Capped at `limit` most-recent rows per table — generous enough for any
// streak/volume threshold this catalog defines (max 100), and keeps the
// query bounded for long-tenured users.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TimelineEntry {
  wasCorrect: boolean;
  at: string; // ISO timestamp
}

export async function loadAttemptTimeline(
  userId: string,
  supabase: SupabaseClient,
  limit = 1000,
): Promise<TimelineEntry[]> {
  const [civicsRes, sectionRes] = await Promise.all([
    supabase
      .from('n400_question_attempts')
      .select('was_correct, answered_at, n400_quiz_attempts!inner(user_id)')
      .eq('n400_quiz_attempts.user_id', userId)
      .order('answered_at', { ascending: false })
      .limit(limit),
    supabase
      .from('n400_section_attempts')
      .select('was_correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: false })
      .limit(limit),
  ]);

  const entries: TimelineEntry[] = [
    ...((civicsRes.data ?? []) as Array<{ was_correct: boolean; answered_at: string }>).map((r) => ({
      wasCorrect: r.was_correct,
      at: r.answered_at,
    })),
    ...((sectionRes.data ?? []) as Array<{ was_correct: boolean; answered_at: string }>).map((r) => ({
      wasCorrect: r.was_correct,
      at: r.answered_at,
    })),
  ];
  entries.sort((a, b) => a.at.localeCompare(b.at));
  return entries;
}

export function longestCorrectRun(entries: TimelineEntry[]): number {
  let max = 0;
  let current = 0;
  for (const e of entries) {
    if (e.wasCorrect) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}
