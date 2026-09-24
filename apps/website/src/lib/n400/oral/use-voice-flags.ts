'use client';

// voice_practice, voice_mock (kill switches) + voice_android (D14). All OFF
// until loaded; `loaded` lets callers wait instead of acting on the defaults.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isFeatureOn, loadFeatureFlags } from '@/lib/n400/growth/flags';

export interface VoiceFlags {
  practiceOn: boolean;
  androidOn: boolean;
  mockOn: boolean;
  loaded: boolean;
}

const OFF: VoiceFlags = { practiceOn: false, androidOn: false, mockOn: false, loaded: false };

export function useVoiceFlags(): VoiceFlags {
  const { user } = useAuth();
  const [flags, setFlags] = useState<VoiceFlags>(OFF);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadFeatureFlags(supabase, ['voice_practice', 'voice_android', 'voice_mock']).then((byKey) => {
      if (cancelled) return;
      setFlags({
        practiceOn: isFeatureOn(byKey.get('voice_practice'), user.id),
        androidOn: isFeatureOn(byKey.get('voice_android'), user.id),
        mockOn: isFeatureOn(byKey.get('voice_mock'), user.id),
        loaded: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return user ? flags : OFF;
}
