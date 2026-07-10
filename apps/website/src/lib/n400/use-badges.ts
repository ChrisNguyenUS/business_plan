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

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { recomputeAllBadges } from './badges/actions';

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

      // Lazy catch-up: recompute all badges once per mount to surface any
      // unlocks that the heuristic-based triggers missed.
      if (user && !recomputedRef.current) {
        recomputedRef.current = true;
        try {
          const newSlugs = await recomputeAllBadges();
          if (!cancelled && newSlugs.length > 0) {
            // New badges were unlocked — re-fetch earned set.
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

