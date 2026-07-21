'use client';

// Journey data for the dashboard hero intent tier (Level 3). Reads the user's
// own n400_lead_profiles row + the growth_engine flag (both readable under
// RLS). enabled=false → callers must leave the behavior ladder untouched.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, type FeatureFlag } from './flags';

export interface GrowthProfile {
  enabled: boolean;
  /** filing_checklist flag on for this user — G3c hero tier gate. */
  checklistEnabled: boolean;
  journeyStage: 'exploring' | 'preparing' | 'filed' | 'waiting_interview' | 'interview_scheduled' | null;
  interviewDate: string | null;
}

const OFF: GrowthProfile = { enabled: false, checklistEnabled: false, journeyStage: null, interviewDate: null };

export function useGrowthProfile(): GrowthProfile {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GrowthProfile>(OFF);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(OFF);
      return;
    }
    let cancelled = false;
    (async () => {
      const [flagRes, leadRes] = await Promise.all([
        supabase
          .from('n400_feature_flags')
          .select('flag_key, enabled, rollout_pct')
          .in('flag_key', ['growth_engine', 'filing_checklist']),
        // Explicit user_id filter — RLS is not a scope here: n400_15 lets
        // admins read every lead_profiles row, and maybeSingle() errors on
        // more than one, silently blanking the journey stage.
        supabase
          .from('n400_lead_profiles')
          .select('journey_stage, interview_date')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const flagRows = (flagRes.data ?? []) as FeatureFlag[];
      const flag = (key: string) => flagRows.find((f) => f.flag_key === key) ?? null;
      if (!isFeatureOn(flag('growth_engine'), user.id)) {
        setProfile(OFF);
        return;
      }
      setProfile({
        enabled: true,
        checklistEnabled: isFeatureOn(flag('filing_checklist'), user.id),
        journeyStage: (leadRes.data?.journey_stage ?? null) as GrowthProfile['journeyStage'],
        interviewDate: leadRes.data?.interview_date ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return profile;
}
