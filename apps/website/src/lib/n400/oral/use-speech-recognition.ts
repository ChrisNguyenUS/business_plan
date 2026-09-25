'use client';

// React side of the mic. VoiceMicProvider (app layout) owns ONE MicController
// shared by practice and mock, so the iOS persistent session survives screen
// changes (spec D15). Without a provider the hook falls back to its own.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { oralDebugEnabled, oralDebugLog } from './oral-debug';
import { PersistentSpeechController } from './persistent-speech-controller';
import {
  SpeechController,
  type MicController,
  type MicSnapshot,
  type RecognitionLike,
  type SpeechControllerDeps,
} from './speech-controller';
import { isIOSDevice } from './voice-support';

const UNAVAILABLE_KEY = 'n400.oral.unavailable';
// Set once a voice answer has worked in this browser: mic permission is granted,
// so warming up before 🔊 can never pop a surprise permission prompt.
const USED_KEY = 'n400.oral.used';

function readUsed(): boolean {
  try {
    return window.localStorage.getItem(USED_KEY) === '1';
  } catch {
    return false;
  }
}

const SERVER_SNAPSHOT: MicSnapshot = { supported: false, state: 'idle', transcript: '', error: null, startedAt: null };
const noopSubscribe = () => () => {};

export interface SpeechApi extends MicSnapshot {
  /** iOS persistent session (D15): the mic stays on between answers. */
  persistent: boolean;
  start(): void;
  stop(): void;
  reset(): void;
  /** Call before playing 🔊 audio (spec D15 rev 3.6). */
  warmUp(): void;
}

function readUnavailable(): boolean {
  try {
    return window.sessionStorage.getItem(UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function reportToSentry(code: string, message?: string): Promise<void> {
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureMessage(`n400 oral: ${code}`, {
      level: 'warning',
      tags: { feature: 'n400-oral', code },
      extra: { message },
    });
  } catch {
    // Sentry unavailable — nothing else to do.
  }
}

export function createMicController(): MicController {
  const Ctor = recognitionCtor();
  const persistent = isIOSDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  const debug = oralDebugEnabled();
  if (debug) {
    oralDebugLog(`api=${Ctor ? 'present' : 'missing'} mode=${persistent ? 'persistent' : 'per-answer'} unavailable=${readUnavailable()}`);
  }
  const deps: SpeechControllerDeps = {
    create: Ctor ? () => new Ctor() : null,
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id as number),
    report: (code, message) => void reportToSentry(code, message),
    markUnavailable: () => {
      try {
        window.sessionStorage.setItem(UNAVAILABLE_KEY, '1');
      } catch {
        // Private mode — the in-memory flag still disables voice for this page.
      }
    },
    unavailable: readUnavailable(),
    log: debug ? oralDebugLog : undefined,
  };
  return persistent ? new PersistentSpeechController(deps) : new SpeechController(deps);
}

export const MicControllerContext = createContext<MicController | null>(null);

export function useSpeechRecognition(): SpeechApi {
  const shared = useContext(MicControllerContext);
  // No window during SSR; hydration uses the server snapshot, then the real one.
  const [own] = useState<MicController | null>(() =>
    shared || typeof window === 'undefined' ? null : createMicController(),
  );
  const controller = shared ?? own;

  const snap = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    () => (controller ? controller.getSnapshot() : SERVER_SNAPSHOT),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (!oralDebugEnabled()) return;
    oralDebugLog(`mount ${window.location.pathname}${window.location.search}`);
    return () => oralDebugLog('unmount');
  }, []);

  // Own controller (no provider): abort on hide unless persistent; release on unmount.
  useEffect(() => {
    if (!own) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !own.persistent) own.abort();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      own.shutdown();
    };
  }, [own]);

  // Shared controller: leaving a screen only resets its capture window.
  useEffect(() => {
    if (!shared) return;
    return () => shared.reset();
  }, [shared]);

  useEffect(() => {
    if (snap.state !== 'transcript') return;
    try {
      window.localStorage.setItem(USED_KEY, '1');
    } catch {
      // Private mode — warm-up just stays off.
    }
  }, [snap.state]);

  const warmUp = useCallback(() => {
    if (!readUsed()) return;
    controller?.warmUp();
  }, [controller]);
  const start = useCallback(() => controller?.start(), [controller]);
  const stop = useCallback(() => controller?.stop(), [controller]);
  const reset = useCallback(() => controller?.reset(), [controller]);
  const persistent = controller?.persistent ?? false;

  return useMemo(
    () => ({ ...snap, persistent, start, stop, reset, warmUp }),
    [snap, persistent, start, stop, reset, warmUp],
  );
}
