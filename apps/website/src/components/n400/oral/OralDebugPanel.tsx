'use client';

// Field-debug panel for the mic (?oraldebug=1). Collapsed to a small pill so it
// never covers the page's buttons; expanded, it shows the SpeechController
// event log in a selectable textarea plus a Copy button with a fallback for
// browsers that block the async clipboard API.

import { useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { oralDebugEnabled, oralDebugLines, subscribeOralDebug } from '@/lib/n400/oral/oral-debug';

const EMPTY: string[] = [];
const noopSubscribe = () => () => {};

export function OralDebugPanel() {
  const enabled = useSyncExternalStore(noopSubscribe, oralDebugEnabled, () => false);
  const lines = useSyncExternalStore(subscribeOralDebug, oralDebugLines, () => EMPTY);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  if (!enabled) return null;

  const text = `UA: ${typeof navigator === 'undefined' ? '' : navigator.userAgent}\n\n${lines.join('\n')}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('yes');
      return;
    } catch {
      // Fall through to the selection-based copy.
    }
    const area = areaRef.current;
    if (!area) return setCopied('failed');
    area.focus();
    area.setSelectionRange(0, area.value.length);
    setCopied(document.execCommand('copy') ? 'yes' : 'failed');
  };

  // Portal to <body>: the app's <main> is its own stacking context (relative
  // z-0, page-transition), which trapped a fixed panel under the header.
  if (!open) {
    return createPortal(
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-2 top-2 z-[100] rounded-full bg-gray-900/80 px-3 py-1 text-xs font-bold text-green-200 shadow"
      >
        log ({lines.length})
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-x-2 top-2 z-[100] rounded-xl bg-gray-900/95 p-2 text-xs text-green-200 shadow-lg">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold text-white">oraldebug</span>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="rounded bg-white/15 px-2 py-1 font-semibold text-white">
            {copied === 'yes' ? 'Copied' : copied === 'failed' ? 'Chọn tay rồi Copy' : 'Copy log'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded bg-white/15 px-2 py-1 font-semibold text-white">
            Đóng
          </button>
        </div>
      </div>
      <textarea
        ref={areaRef}
        readOnly
        value={text}
        className="h-[35vh] w-full rounded bg-black/40 p-1 font-mono text-[11px] leading-snug text-green-200"
        style={{ fontSize: '16px' }}
      />
    </div>,
    document.body,
  );
}
