'use client';

// Field-debug panel for the mic (?oraldebug=1). Shows the SpeechController
// event log with a Copy button so a tester can send it from a real phone.

import { useState, useSyncExternalStore } from 'react';
import { oralDebugEnabled, oralDebugLines, subscribeOralDebug } from '@/lib/n400/oral/oral-debug';

const EMPTY: string[] = [];
const noopSubscribe = () => () => {};

export function OralDebugPanel() {
  const enabled = useSyncExternalStore(noopSubscribe, oralDebugEnabled, () => false);
  const lines = useSyncExternalStore(subscribeOralDebug, oralDebugLines, () => EMPTY);
  const [copied, setCopied] = useState(false);
  if (!enabled) return null;

  const copy = async () => {
    const text = `UA: ${navigator.userAgent}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 max-h-[40vh] overflow-auto rounded-xl bg-gray-900/90 p-2 text-[11px] leading-snug text-green-200 shadow-lg">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold text-white">oraldebug</span>
        <button type="button" onClick={copy} className="rounded bg-white/15 px-2 py-0.5 font-semibold text-white">
          {copied ? 'Copied' : 'Copy log'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-mono">{lines.join('\n') || '(no events yet)'}</pre>
    </div>
  );
}
