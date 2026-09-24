'use client';

// voice_practice (kill switch) + voice_android (D14). Both default OFF until loaded.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, loadFeatureFlags } from '@/lib/n400/growth/flags';

export interface VoiceFlags {
  practiceOn: boolean;
  androidOn: boolean;
}

const OFF: VoiceFlags = { practiceOn: false, androidOn: false };

export function useVoiceFlags(): VoiceFlags {
  const { user } = useAuth();
  const [flags, setFlags] = useState<VoiceFlags>(OFF);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadFeatureFlags(supabase, ['voice_practice', 'voice_android']).then((byKey) => {
      if (cancelled) return;
      setFlags({
        practiceOn: isFeatureOn(byKey.get('voice_practice'), user.id),
        androidOn: isFeatureOn(byKey.get('voice_android'), user.id),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return user ? flags : OFF;
}
