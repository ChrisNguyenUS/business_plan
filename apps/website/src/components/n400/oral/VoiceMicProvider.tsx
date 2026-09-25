'use client';

// One MicController for the whole (app) layout (spec D15): on iOS the single
// continuous session must outlive screen changes (practice ↔ mock, choice ↔ voice).

import { useEffect, useState, type ReactNode } from 'react';
import { oralDebugEnabled, oralDebugLog } from '@/lib/n400/oral/oral-debug';
import type { MicController } from '@/lib/n400/oral/speech-controller';
import { createMicController, MicControllerContext } from '@/lib/n400/oral/use-speech-recognition';

export function VoiceMicProvider({ children }: { children: ReactNode }) {
  // Created lazily on the client: SpeechRecognition doesn't exist during SSR.
  const [controller] = useState<MicController | null>(() =>
    typeof window === 'undefined' ? null : createMicController(),
  );

  useEffect(() => {
    if (!controller) return;
    const onVisibility = () => {
      if (oralDebugEnabled()) oralDebugLog(`visibility=${document.visibilityState}`);
      // iOS keeps the persistent session alive across app/tab switches; aborting it
      // would force a new session, which WebKit leaves deaf (spec D15).
      if (document.visibilityState === 'hidden' && !controller.persistent) controller.abort();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      controller.shutdown();
    };
  }, [controller]);

  // Field diagnosis only (?oraldebug=1).
  useEffect(() => {
    if (!oralDebugEnabled()) return;
    const onError = (e: ErrorEvent) => oralDebugLog(`window error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) => oralDebugLog(`unhandledrejection: ${String(e.reason)}`);
    const onPageHide = (e: PageTransitionEvent) => oralDebugLog(`pagehide persisted=${e.persisted}`);
    const onPageShow = (e: PageTransitionEvent) => oralDebugLog(`pageshow persisted=${e.persisted}`);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return <MicControllerContext.Provider value={controller}>{children}</MicControllerContext.Provider>;
}
