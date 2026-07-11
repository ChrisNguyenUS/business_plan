'use client';

// Gamification v2 — Badge data loader hook.
//
// Reads two tables on mount:
//   1. n400_badges (catalog — 56 rows, RLS public read)
//   2. n400_user_badges (earned — RLS scoped to auth.uid())
//
// On first mount it also fires a non-blocking recomputeAllBadges() call
// to catch any unlocks that were missed (e.g., streak milestones crossed
// before badge system was deployed, or session_complete evaluators skipped
// by the every-5th heuristic). If new badges are unlocked, earned state
// is re-fetched so the UI updates without a refresh.
//
// The recompute is throttled to once per RECOMPUTE_INTERVAL_MS per user
// (localStorage timestamp): the hook mounts on 5 different pages, and an
// unthrottled recompute ran the full 56-evaluator sweep on every page
// navigation. Live unlocks don't need it — session_complete/streak_change
// triggers cover those — it only exists to heal missed/backdated unlocks,
// so daily is plenty.

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { recomputeAllBadges } from './badges/actions';

const RECOMPUTE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const recomputeStorageKey = (userId: string) => `n400-badges-recompute-at:${userId}`;

function shouldRecompute(userId: string): boolean {
  try {
    const last = Number(localStorage.getItem(recomputeStorageKey(userId)));
    return !(last > 0 && Date.now() - last < RECOMPUTE_INTERVAL_MS);
  } catch {
    // Storage unavailable (private mode etc.) — recompute; the per-mount
    // ref still prevents repeats within this mount.
    return true;
  }
}

function markRecomputed(userId: string) {
  try {
    localStorage.setItem(recomputeStorageKey(userId), String(Date.now()));
  } catch {
    // Best-effort only.
  }
}

export type BadgeGroupCode =
  | 'streak'
  | 'civics'
  | 'writing'
  | 'yesno'
  | 'whatmean'
  | 'combo'
  | 'practice'
  | 'other'
  | 'secret';

export interface BadgeMeta {
  slug: string;
  title_vi: string;
  title_en: string;
  description_vi: string;
  description_en: string;
  group_code: BadgeGroupCode;
  sort_order: number;
  is_secret: boolean;
}

export interface UserBadge {
  slug: string;
  unlocked_at: string;
}

export interface UseN400BadgesResult {
  hydrated: boolean;
  catalog: BadgeMeta[];
  earned: UserBadge[];
  earnedSlugs: Set<string>;
}

export function useN400Badges(): UseN400BadgesResult {
  const { user, loading: authLoading } = useAuth();
  const [catalog, setCatalog] = useState<BadgeMeta[]>([]);
  const [earned, setEarned] = useState<UserBadge[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Only recompute once per mount to avoid hammering the server.
  const recomputedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const [catRes, earnedRes] = await Promise.all([
        supabase
          .from('n400_badges')
          .select('slug,title_vi,title_en,description_vi,description_en,group_code,sort_order,is_secret')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        user
          ? supabase
              .from('n400_user_badges')
              .select('slug,unlocked_at')
              .eq('user_id', user.id)
              .order('unlocked_at', { ascending: false })
          : Promise.resolve({ data: [] as UserBadge[] }),
      ]);
      if (cancelled) return;
      setCatalog((catRes.data ?? []) as BadgeMeta[]);
      setEarned((earnedRes.data ?? []) as UserBadge[]);
      setHydrated(true);

      // Lazy catch-up: recompute all badges to surface any unlocks that the
      // heuristic-based triggers missed AND to fix unlocked_at dates on
      // already-existing badges. Throttled to once per day per user — see
      // the module comment above.
      if (user && !recomputedRef.current && shouldRecompute(user.id)) {
        recomputedRef.current = true;
        try {
          await recomputeAllBadges();
          markRecomputed(user.id);
          // Always re-fetch: even when no NEW badges were inserted, the
          // recompute may have corrected unlocked_at dates on existing
          // badges (e.g., fixing "today" → actual historical date).
          if (!cancelled) {
            const refreshed = await supabase
              .from('n400_user_badges')
              .select('slug,unlocked_at')
              .eq('user_id', user.id)
              .order('unlocked_at', { ascending: false });
            if (!cancelled) {
              setEarned((refreshed.data ?? []) as UserBadge[]);
            }
          }
        } catch (e) {
          // Non-critical — don't break the gallery.
          console.error('n400/badges: lazy recompute failed', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const earnedSlugs = new Set(earned.map((e) => e.slug));
  return { hydrated, catalog, earned, earnedSlugs };
}

