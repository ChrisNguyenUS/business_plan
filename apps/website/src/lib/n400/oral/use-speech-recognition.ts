'use client';

// Thin React wrapper over SpeechController (the only file that touches the
// browser's Web Speech API). Spec §4.1.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { oralDebugEnabled, oralDebugLog } from './oral-debug';
import { SpeechController, type MicSnapshot, type RecognitionLike } from './speech-controller';

const UNAVAILABLE_KEY = 'n400.oral.unavailable';

const SERVER_SNAPSHOT: MicSnapshot = { supported: false, state: 'idle', transcript: '', error: null, startedAt: null };
const noopSubscribe = () => () => {};

export interface SpeechApi extends MicSnapshot {
  start(): void;
  stop(): void;
  reset(): void;
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

function createController(): SpeechController {
  const Ctor = recognitionCtor();
  const debug = oralDebugEnabled();
  if (debug) oralDebugLog(`api=${Ctor ? 'present' : 'missing'} unavailable=${readUnavailable()}`);
  return new SpeechController({
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
  });
}

export function useSpeechRecognition(): SpeechApi {
  // No window during SSR; hydration uses the server snapshot, then the real one.
  const [controller] = useState<SpeechController | null>(() =>
    typeof window === 'undefined' ? null : createController(),
  );

  const snap = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    () => (controller ? controller.getSnapshot() : SERVER_SNAPSHOT),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (!controller) return;
    const onVisibility = () => {
      if (oralDebugEnabled()) oralDebugLog(`visibility=${document.visibilityState}`);
      if (document.visibilityState === 'hidden') controller.abort();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      controller.abort();
    };
  }, [controller]);

  const start = useCallback(() => controller?.start(), [controller]);
  const stop = useCallback(() => controller?.stop(), [controller]);
  const reset = useCallback(() => controller?.reset(), [controller]);

  return useMemo(() => ({ ...snap, start, stop, reset }), [snap, start, stop, reset]);
}
