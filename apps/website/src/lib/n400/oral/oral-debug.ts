// Diagnostic mic event log for field debugging on real devices (e.g. iPhone
// Safari). Enabled per tab with ?oraldebug=1; otherwise nothing is recorded.

const KEY = 'n400.oral.debug';
const MAX_LINES = 200;

let lines: string[] = [];
let t0 = 0;
const listeners = new Set<() => void>();

export function oralDebugEnabled(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('oraldebug') === '1') {
      window.sessionStorage.setItem(KEY, '1');
    }
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function oralDebugLog(event: string): void {
  const now = Date.now();
  if (!t0) t0 = now;
  lines = [...lines, `${((now - t0) / 1000).toFixed(2)}s ${event}`].slice(-MAX_LINES);
  for (const fn of listeners) fn();
}

export function oralDebugLines(): string[] {
  return lines;
}

export function subscribeOralDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
