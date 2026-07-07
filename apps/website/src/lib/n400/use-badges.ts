'use client';

// Gamification v2 — Badge data loader hook.
//
// Reads two tables on mount:
//   1. n400_badges (catalog — 56 rows, RLS public read)
//   2. n400_user_badges (earned — RLS scoped to auth.uid())
//
// Both are cheap. We don't subscribe to realtime — unlocks come back
// directly from the finalize actions and the page that triggers them
// is responsible for surfacing the toast. This hook is for read-only
// surfaces (profile gallery, dashboard preview).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';

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
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const earnedSlugs = new Set(earned.map((e) => e.slug));
  return { hydrated, catalog, earned, earnedSlugs };
}
