# N400 Oral Answers — iOS Persistent Recognition Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mic work for every answer on iPhone Safari. On iOS, keep ONE continuous recognition session open for the whole app and treat each answer as a capture window over it. Other browsers keep the per-answer session.

**Architecture:** A second controller, `PersistentSpeechController`, implements the same `MicController` interface as the existing `SpeechController`. Shared helpers (error classification, result joining) move to exported functions. `VoiceMicProvider` in the `(app)` layout owns one controller for the whole app, so the iOS session survives screen changes. `useSpeechRecognition()` reads the controller from context, and leaving a screen only resets its capture window. The UI stops recommending a reload: `stalled` switches practice to the typed box, as the mock already does.

**Tech Stack:** TypeScript, React 19 client components, Next.js 16 app router, vitest 2 (node, no DOM).

**Spec:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` rev 3.5, D15 and the "Persistent mode" bullet in §4.1, §8 `stalled` row, §10, §11. Evidence: the device logs in this conversation, summarised in D15.

## Global Constraints

- Run commands from `apps/website/`. vitest runs in node. Full gate: `npm run type-check && npm run test && npm run build`. `src/components/n400/mobile-layout.test.ts` is a pre-existing failure on main; ignore only that one.
- Persistent mode applies only when `isIOSDevice(ua, maxTouchPoints)` is true (iPhone/iPod/iPad, and iPadOS reporting a Mac UA with touch). All other browsers keep `SpeechController` unchanged.
- Persistent session: `continuous = true`, `interimResults = true`, `lang = 'en-US'`. Its recognizer is started once, and **never** started a second time while it is alive.
- Capture window constants: `SETTLE_MS = 1_200`, cap `HARD_STOP_MS = 15_000`, stall `STALL_MS = 7_000` (counted from `audiostart` for a brand-new session), `IDLE_SHUTDOWN_MS = 5 * 60_000`.
- Results outside a window are discarded in memory; never shown, stored, graded or logged as text (D15, §10).
- No UI copy may tell the learner to reload the page for the mic (rev 3.5).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. The learner taps the mic for answer 2. The recognizer must **not** get a second `start()` while the session lives (Task 2 test `one session across answers`).
2. Ambient speech between answers must never end up in an answer (Task 2 test `results outside a window are ignored`).
3. The learner starts talking while iOS hasn't finalized the previous ambient result. Their first words must be kept (Task 2 test `a window starts at the first non-final result`).
4. iOS ends the session by itself while the learner is looking at a transcript. The screen must not be clobbered, and the next tap must start a fresh session (Task 2 test `the session ending outside a window leaves the screen alone`).
5. A deaf session: the learner must reach a typed fallback within two silent windows, never a reload hint (Task 2 test `second silent window shuts the session down as stalled`, Task 5 wiring tests).

---

### Task 1: `MicController` interface and shared helpers

**Files:**
- Modify: `apps/website/src/lib/n400/oral/speech-controller.ts`
- Test: `apps/website/src/lib/n400/oral/speech-controller.test.ts`

**Interfaces:**
- Produces:
  - `type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>` (the `onresult` event now carries it);
  - `joinResultsFrom(results: RecognitionResultList, from: number): string`;
  - `classifyMicError(code: string, heardAudio: boolean, sinceStartMs: number): { error: MicError; disable: boolean } | null` (`null` for `aborted`);
  - `interface MicController { readonly persistent: boolean; getSnapshot(): MicSnapshot; subscribe(fn: () => void): () => void; start(): void; stop(): void; reset(): void; abort(): void; shutdown(): void }`;
  - `SpeechController implements MicController`, with `persistent = false` and `shutdown()`.

- [ ] **Step 1: Failing tests** — append to `speech-controller.test.ts` (and add `classifyMicError, joinResultsFrom` to its import from `./speech-controller`):

```ts
describe('shared helpers (rev 3.5)', () => {
  it('classifyMicError keeps the per-answer rules', () => {
    expect(classifyMicError('aborted', false, 0)).toBeNull();
    expect(classifyMicError('not-allowed', false, 100)).toEqual({ error: 'unavailable', disable: true });
    expect(classifyMicError('not-allowed', false, 3_000)).toEqual({ error: 'not-allowed', disable: false });
    expect(classifyMicError('not-allowed', true, 100)).toEqual({ error: 'not-allowed', disable: false });
    expect(classifyMicError('service-not-allowed', true, 9_000)).toEqual({ error: 'unavailable', disable: true });
    expect(classifyMicError('network', true, 0)).toEqual({ error: 'network', disable: false });
    expect(classifyMicError('no-speech', true, 0)).toEqual({ error: 'no-speech', disable: false });
    expect(classifyMicError('language-not-supported', true, 0)).toEqual({ error: 'unavailable', disable: false });
  });

  it('joinResultsFrom joins from an index with single spaces', () => {
    const r = [[{ transcript: 'ambient' }], [{ transcript: 'Congress' }], [{ transcript: ' and the courts' }]];
    expect(joinResultsFrom(r, 1)).toBe('Congress and the courts');
    expect(joinResultsFrom(r, 3)).toBe('');
  });

  it('the per-answer controller is not persistent and shutdown releases the mic', () => {
    const h = harness();
    live(h);
    h.c.shutdown();
    expect(h.c.persistent).toBe(false);
    expect(h.s().state).toBe('idle');
    expect(h.recs[0].aborted).toBe(1);
  });
});
```

Run: `npx vitest run src/lib/n400/oral/speech-controller.test.ts` → FAIL (`classifyMicError` / `joinResultsFrom` not exported; `shutdown` missing).

- [ ] **Step 2: Implement** in `speech-controller.ts`:
  1. Add `export type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;` and change the `onresult` member to `onresult: ((e: { results: RecognitionResultList }) => void) | null;`.
  2. Replace `function joinResults(...)` with:

```ts
/** Results from `from` joined with single spaces (Chrome segments may or may not lead with one). */
export function joinResultsFrom(results: RecognitionResultList, from: number): string {
  const parts: string[] = [];
  for (let i = from; i < results.length; i++) parts.push(results[i]?.[0]?.transcript ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Recognizer error → learner-facing MicError; `disable` = voice unavailable for this session. */
export function classifyMicError(
  code: string,
  heardAudio: boolean,
  sinceStartMs: number,
): { error: MicError; disable: boolean } | null {
  if (code === 'aborted') return null; // our own abort()
  if (code === 'service-not-allowed') return { error: 'unavailable', disable: true };
  if (code === 'not-allowed') {
    return !heardAudio && sinceStartMs < INSTANT_DENY_MS
      ? { error: 'unavailable', disable: true }
      : { error: 'not-allowed', disable: false };
  }
  return { error: ERROR_MAP[code] ?? 'unavailable', disable: false };
}

export interface MicController {
  readonly persistent: boolean;
  getSnapshot(): MicSnapshot;
  subscribe(fn: () => void): () => void;
  start(): void;
  stop(): void;
  reset(): void;
  abort(): void;
  shutdown(): void;
}
```

  3. `export class SpeechController implements MicController {` with `readonly persistent = false;` as its first member.
  4. In `onresult`, replace `this.text = joinResults(e.results);` with `this.text = joinResultsFrom(e.results, 0);`.
  5. Replace the body of `onError` after the log line with:

```ts
    const c = classifyMicError(code, this.heardAudio, this.deps.now() - this.startedAt);
    if (!c) return;
    if (c.disable) {
      this.disabled = true;
      this.deps.markUnavailable?.();
    }
    if (c.error !== 'no-speech') this.deps.report?.(code, message);
    if (this.pendingError === null) this.pendingError = c.error;
```

  6. Add after `abort()`:

```ts
  /** Release the mic entirely (MicController). Per-answer: same as abort. */
  shutdown(): void {
    this.abort();
  }
```

- [ ] **Step 3: Verify** — `npx vitest run src/lib/n400/oral/speech-controller.test.ts` → PASS (all tests, including the untouched per-answer suite); `npm run type-check` → 0.

- [ ] **Step 4: Commit** — `refactor(n400app): MicController interface + shared mic error/result helpers`.

---

### Task 2: `PersistentSpeechController`

**Files:**
- Create: `apps/website/src/lib/n400/oral/persistent-speech-controller.ts`
- Test: `apps/website/src/lib/n400/oral/persistent-speech-controller.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `HARD_STOP_MS`, `STALL_MS`, `SpeechControllerDeps`, `MicSnapshot`, `MicState`, `MicError`, `RecognitionLike`.
- Produces: `class PersistentSpeechController implements MicController` (`persistent = true`), `SETTLE_MS`, `IDLE_SHUTDOWN_MS`.

- [ ] **Step 1: Failing tests** — create `persistent-speech-controller.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { IDLE_SHUTDOWN_MS, PersistentSpeechController, SETTLE_MS } from './persistent-speech-controller';
import { HARD_STOP_MS, STALL_MS, type RecognitionLike, type SpeechControllerDeps } from './speech-controller';

type Seg = [text: string, isFinal: boolean];

class FakeRec implements RecognitionLike {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onstart: RecognitionLike['onstart'] = null;
  onaudiostart: RecognitionLike['onaudiostart'] = null;
  onspeechstart: RecognitionLike['onspeechstart'] = null;
  onspeechend: RecognitionLike['onspeechend'] = null;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  started = 0;
  stopped = 0;
  aborted = 0;
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {
    this.aborted++;
  }
  /** The whole results list of the continuous session, as WebKit reports it. */
  emit(...segs: Seg[]) {
    this.onresult?.({ results: segs.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f })) });
  }
}

function harness(extra: Partial<SpeechControllerDeps> = {}) {
  let t = 1_000;
  let seq = 0;
  let timers: { id: number; at: number; fn: () => void }[] = [];
  const recs: FakeRec[] = [];
  let marked = 0;
  const c = new PersistentSpeechController({
    create: () => {
      const r = new FakeRec();
      recs.push(r);
      return r;
    },
    now: () => t,
    setTimer: (fn, ms) => {
      const id = ++seq;
      timers.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimer: (id) => {
      timers = timers.filter((x) => x.id !== id);
    },
    markUnavailable: () => {
      marked++;
    },
    ...extra,
  });
  const advance = (ms: number) => {
    const until = t + ms;
    for (;;) {
      const due = timers.filter((x) => x.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter((x) => x !== due);
      t = due.at;
      due.fn();
    }
    t = until;
  };
  return { c, recs, rec: () => recs[recs.length - 1], advance, marked: () => marked, s: () => c.getSnapshot() };
}

/** First tap: session starts, WebKit reports start + audio. */
function open(h: ReturnType<typeof harness>) {
  h.c.start();
  h.rec().onstart?.();
  h.rec().onaudiostart?.();
}

describe('PersistentSpeechController (spec D15, rev 3.5)', () => {
  it('configures one continuous recognizer', () => {
    const h = harness();
    h.c.start();
    expect(h.c.persistent).toBe(true);
    expect(h.rec()).toMatchObject({ lang: 'en-US', continuous: true, interimResults: true, maxAlternatives: 1, started: 1 });
    expect(h.s().state).toBe('requesting_permission');
  });

  it('one session across answers: the second answer does not start a new recognizer', () => {
    const h = harness();
    open(h);
    h.rec().emit(['The constitution', true]);
    expect(h.s().state).toBe('processing');
    h.advance(SETTLE_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'The constitution' });

    h.c.reset(); // next question
    expect(h.s().state).toBe('idle');
    h.c.start();
    expect(h.s().state).toBe('listening');
    expect(h.recs).toHaveLength(1);
    expect(h.recs[0]).toMatchObject({ started: 1, aborted: 0, stopped: 0 });

    h.rec().emit(['The constitution', true], ['27', true]);
    h.advance(SETTLE_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: '27' });
  });

  it('results outside a window are ignored', () => {
    const h = harness();
    open(h);
    h.rec().emit(['The constitution', true]);
    h.advance(SETTLE_MS);
    h.rec().emit(['The constitution', true], ['Pressure', true]); // ambient, no window
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'The constitution' });

    h.c.reset();
    h.c.start();
    h.rec().emit(['The constitution', true], ['Pressure', true], ['Checks and balances', true]);
    h.advance(SETTLE_MS);
    expect(h.s().transcript).toBe('Checks and balances');
  });

  it('a window starts at the first non-final result so the first words are kept', () => {
    const h = harness();
    open(h);
    h.rec().emit(['The constitution', true]);
    h.advance(SETTLE_MS);
    h.c.reset();
    h.rec().emit(['The constitution', true], ['Con', false]); // learner already talking
    h.c.start();
    h.rec().emit(['The constitution', true], ['Congress president and the courts', true]);
    h.advance(SETTLE_MS);
    expect(h.s().transcript).toBe('Congress president and the courts');
  });

  it('keeps the window open while the learner is still talking', () => {
    const h = harness();
    open(h);
    h.rec().emit(['Congress', true]);
    h.advance(SETTLE_MS - 200);
    h.rec().emit(['Congress', true], ['the president', false]);
    h.advance(SETTLE_MS);
    expect(h.s().state).toBe('listening');
    h.rec().emit(['Congress', true], ['the president and the courts', true]);
    h.advance(SETTLE_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'Congress the president and the courts' });
  });

  it('Stop closes the window with what it heard; the session stays', () => {
    const h = harness();
    open(h);
    h.rec().emit(['Freedom of', false]);
    h.c.stop();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'Freedom of' });
    expect(h.recs[0]).toMatchObject({ stopped: 0, aborted: 0 });
  });

  it('the 15 s cap closes the window', () => {
    const h = harness();
    open(h);
    h.rec().emit(['checks and', false]);
    h.advance(HARD_STOP_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'checks and' });
  });

  it('a silent window is no-speech and keeps the session', () => {
    const h = harness();
    open(h);
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'no-speech' });
    expect(h.recs[0].aborted).toBe(0);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('second silent window shuts the session down as stalled', () => {
    const h = harness();
    open(h);
    h.advance(STALL_MS);
    h.c.start();
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'stalled' });
    expect(h.recs[0].aborted).toBe(1);
    h.c.start();
    expect(h.recs).toHaveLength(2); // a fresh session on the next tap
  });

  it('a heard answer resets the stall count', () => {
    const h = harness();
    open(h);
    h.advance(STALL_MS);
    h.c.start();
    h.rec().emit(['27', true]);
    h.advance(SETTLE_MS);
    h.c.start();
    h.advance(STALL_MS);
    expect(h.s().error).toBe('no-speech');
  });

  it('the stall clock of a new session starts at audiostart', () => {
    const h = harness();
    h.c.start();
    h.rec().onstart?.();
    h.advance(3_000); // permission prompt
    h.rec().onaudiostart?.();
    h.advance(STALL_MS - 1);
    expect(h.s().state).toBe('listening');
    h.advance(1);
    expect(h.s().error).toBe('no-speech');
  });

  it('tab hidden (abort) keeps the session', () => {
    const h = harness();
    open(h);
    h.c.abort();
    expect(h.s().state).toBe('idle');
    expect(h.recs[0].aborted).toBe(0);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('shutdown releases the mic; the next tap starts a new session', () => {
    const h = harness();
    open(h);
    h.c.shutdown();
    expect(h.recs[0].aborted).toBe(1);
    expect(h.recs[0].onresult).toBeNull();
    expect(h.s().state).toBe('idle');
    h.c.start();
    expect(h.recs).toHaveLength(2);
  });

  it('idle for 5 minutes shuts the session down without touching the screen', () => {
    const h = harness();
    open(h);
    h.rec().emit(['27', true]);
    h.advance(SETTLE_MS);
    h.advance(IDLE_SHUTDOWN_MS);
    expect(h.recs[0].aborted).toBe(1);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: '27' });
  });

  it('the session ending mid-window closes the window with what it heard', () => {
    const h = harness();
    open(h);
    h.rec().emit(['Con', false]);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'Con' });
    h.c.start();
    expect(h.recs).toHaveLength(2);
  });

  it('the session ending outside a window leaves the screen alone', () => {
    const h = harness();
    open(h);
    h.rec().emit(['27', true]);
    h.advance(SETTLE_MS);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: '27' });
    h.c.start();
    expect(h.recs).toHaveLength(2);
  });

  it('instant deny disables voice for the session', () => {
    const h = harness();
    h.c.start();
    h.advance(20);
    h.rec().onerror?.({ error: 'not-allowed' });
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: 'unavailable', supported: false });
    expect(h.marked()).toBe(1);
  });

  it('a second tap while a window is open is ignored', () => {
    const h = harness();
    open(h);
    h.c.start();
    expect(h.recs).toHaveLength(1);
    expect(h.s().state).toBe('listening');
  });

  it('is unsupported without the API', () => {
    const h = harness({ create: null });
    expect(h.s().supported).toBe(false);
    h.c.start();
    expect(h.s().state).toBe('idle');
  });
});
```

Run: `npx vitest run src/lib/n400/oral/persistent-speech-controller.test.ts` → FAIL (`Failed to load url ./persistent-speech-controller`).

- [ ] **Step 2: Implement** — create `persistent-speech-controller.ts`:

```ts
// iOS: ONE continuous recognition session, with a capture window per answer.
// WebKit on iOS leaves every NEW session after the first one in a browser
// process deaf, but a single continuous session keeps hearing for minutes,
// across silences and app/tab switches (verified on device 2026-09-24).
// Spec D15 and §4.1 "Persistent mode" (rev 3.5).

import {
  classifyMicError,
  HARD_STOP_MS,
  joinResultsFrom,
  STALL_MS,
  type MicController,
  type MicError,
  type MicSnapshot,
  type MicState,
  type RecognitionLike,
  type RecognitionResultList,
  type SpeechControllerDeps,
} from './speech-controller';

export const SETTLE_MS = 1_200;
export const IDLE_SHUTDOWN_MS = 5 * 60_000;

const NO_RESULTS: RecognitionResultList = [];

/** First result that isn't final yet (the learner may already be in it), else the end. */
function firstOpenIndex(results: RecognitionResultList): number {
  for (let i = 0; i < results.length; i++) if (results[i]?.isFinal !== true) return i;
  return results.length;
}

function allFinalFrom(results: RecognitionResultList, from: number): boolean {
  if (results.length <= from) return false;
  for (let i = from; i < results.length; i++) if (results[i]?.isFinal !== true) return false;
  return true;
}

export class PersistentSpeechController implements MicController {
  readonly persistent = true;
  private snap: MicSnapshot;
  private readonly listeners = new Set<() => void>();
  private rec: RecognitionLike | null = null;
  private sessionStartedAt = 0;
  private heardAudio = false;
  private results: RecognitionResultList = NO_RESULTS;
  private windowOpen = false;
  private windowFrom = 0;
  private windowText = '';
  private awaitingAudio = false;
  private pendingError: MicError | null = null;
  private disabled: boolean;
  private stalledInRow = 0;
  private windowTimers: unknown[] = [];
  private stallTimer: unknown = null;
  private settleTimer: unknown = null;
  private idleTimer: unknown = null;

  constructor(private readonly deps: SpeechControllerDeps) {
    this.disabled = !!deps.unavailable;
    this.snap = {
      supported: deps.create !== null && !this.disabled,
      state: 'idle',
      transcript: '',
      error: null,
      startedAt: null,
    };
  }

  getSnapshot = (): MicSnapshot => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /** Mic tap: open a capture window; start the session only if none is running. */
  start(): void {
    const create = this.deps.create;
    if (!create || !this.snap.supported || this.windowOpen) return;
    this.clearIdle();
    if (this.rec) {
      this.openWindow(false);
      return;
    }
    if (this.openSession(create)) this.openWindow(true);
  }

  /** Learner tapped Stop: close the window with what it heard. The session stays. */
  stop(): void {
    if (!this.windowOpen) return;
    this.deps.log?.('stop');
    this.closeWindow();
  }

  /** New question / Nói lại / leaving a screen: drop the window, keep the session. */
  reset(): void {
    this.discardWindow();
    if (this.rec) this.armIdle();
    this.finish('idle', null);
  }

  /** Tab hidden: WebKit keeps the session; aborting it would force a deaf new one. */
  abort(): void {
    this.reset();
  }

  /** Release the mic entirely (idle, leaving the app, deaf session). */
  shutdown(): void {
    this.deps.log?.('shutdown');
    this.discardWindow();
    this.killSession();
    this.finish('idle', null);
  }

  private openSession(create: () => RecognitionLike): boolean {
    let rec: RecognitionLike;
    try {
      rec = create();
    } catch (e) {
      this.deps.report?.('create-threw', String(e));
      this.finish('error', 'unavailable');
      return false;
    }
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.rec = rec;
    this.sessionStartedAt = this.deps.now();
    this.heardAudio = false;
    this.results = NO_RESULTS;
    this.deps.log?.('session start');

    rec.onstart = () => {
      this.deps.log?.('onstart');
      if (this.windowOpen) this.set({ state: 'listening' });
    };
    rec.onaudiostart = () => {
      this.deps.log?.('audiostart');
      this.heardAudio = true;
      if (this.windowOpen && this.awaitingAudio) {
        this.awaitingAudio = false;
        this.armStall();
      }
    };
    rec.onspeechstart = () => this.deps.log?.('speechstart');
    rec.onspeechend = () => this.deps.log?.('speechend');
    rec.onresult = (e) => this.onResult(e.results);
    rec.onerror = (e) => this.onError(e.error, e.message);
    rec.onend = () => {
      this.deps.log?.('end');
      this.onSessionEnd();
    };
    try {
      rec.start();
    } catch (e) {
      this.deps.report?.('start-threw', String(e));
      this.detach(rec);
      this.rec = null;
      this.finish('error', 'unavailable');
      return false;
    }
    return true;
  }

  private openWindow(newSession: boolean): void {
    this.windowOpen = true;
    this.windowFrom = newSession ? 0 : firstOpenIndex(this.results);
    this.windowText = '';
    this.pendingError = null;
    this.awaitingAudio = newSession && !this.heardAudio;
    this.deps.log?.(`window open from=${this.windowFrom}`);
    this.windowTimer(() => this.closeWindow(), HARD_STOP_MS);
    if (!this.awaitingAudio) this.armStall();
    this.set({
      state: newSession ? 'requesting_permission' : 'listening',
      transcript: '',
      error: null,
      startedAt: this.deps.now(),
    });
  }

  private onResult(results: RecognitionResultList): void {
    this.results = results;
    if (!this.windowOpen) {
      this.deps.log?.('result outside window (ignored)');
      return;
    }
    const text = joinResultsFrom(results, this.windowFrom);
    this.windowText = text;
    this.deps.log?.(`result "${text}"`);
    if (text) this.heard();
    const settled = text !== '' && allFinalFrom(results, this.windowFrom);
    if (this.settleTimer !== null) {
      this.deps.clearTimer(this.settleTimer);
      this.settleTimer = null;
    }
    this.set({ transcript: text, state: settled ? 'processing' : 'listening' });
    if (settled) this.settleTimer = this.windowTimer(() => this.closeWindow(), SETTLE_MS);
  }

  private heard(): void {
    this.stalledInRow = 0;
    this.awaitingAudio = false;
    if (this.stallTimer !== null) {
      this.deps.clearTimer(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private armStall(): void {
    if (this.stallTimer !== null) this.deps.clearTimer(this.stallTimer);
    this.stallTimer = this.windowTimer(() => this.onStall(), STALL_MS);
  }

  private onStall(): void {
    this.stallTimer = null;
    if (!this.windowOpen || this.windowText) return;
    this.stalledInRow += 1;
    this.deps.log?.(`stall in_row=${this.stalledInRow}`);
    this.deps.report?.('stall', `in_row=${this.stalledInRow} persistent`);
    this.discardWindow();
    if (this.stalledInRow >= 2) {
      // Two silent windows in a row: treat the session as deaf; the page switches to typing.
      this.killSession();
      this.finish('error', 'stalled');
      return;
    }
    if (this.rec) this.armIdle();
    this.finish('error', 'no-speech');
  }

  private onError(code: string, message?: string): void {
    this.deps.log?.(`error ${code}${message ? ` ${message}` : ''}`);
    const c = classifyMicError(code, this.heardAudio, this.deps.now() - this.sessionStartedAt);
    if (!c) return;
    if (c.disable) {
      this.disabled = true;
      this.deps.markUnavailable?.();
    }
    if (c.error !== 'no-speech') this.deps.report?.(code, message);
    if (this.windowOpen && this.pendingError === null) this.pendingError = c.error;
  }

  private onSessionEnd(): void {
    const rec = this.rec;
    if (!rec) return;
    this.detach(rec);
    this.rec = null;
    this.results = NO_RESULTS;
    this.clearIdle();
    if (this.windowOpen) this.closeWindow();
    else if (this.disabled && this.snap.supported) this.set({ supported: false });
  }

  private closeWindow(): void {
    if (!this.windowOpen) return;
    const text = this.windowText.trim();
    const err = this.pendingError;
    this.discardWindow();
    if (this.rec) this.armIdle();
    this.deps.log?.(`window close${err ? ` error=${err}` : ''}`);
    if (err) this.finish('error', err);
    else if (text) this.finish('transcript', null, text);
    else this.finish('error', 'no-speech');
  }

  private discardWindow(): void {
    this.windowOpen = false;
    this.windowText = '';
    this.awaitingAudio = false;
    for (const id of this.windowTimers) this.deps.clearTimer(id);
    this.windowTimers = [];
    this.stallTimer = null;
    this.settleTimer = null;
  }

  private armIdle(): void {
    this.clearIdle();
    this.idleTimer = this.deps.setTimer(() => {
      this.idleTimer = null;
      this.deps.log?.('idle shutdown');
      this.killSession();
    }, IDLE_SHUTDOWN_MS);
  }

  private clearIdle(): void {
    if (this.idleTimer !== null) this.deps.clearTimer(this.idleTimer);
    this.idleTimer = null;
  }

  private killSession(): void {
    this.clearIdle();
    const rec = this.rec;
    if (!rec) return;
    this.detach(rec);
    this.rec = null;
    this.results = NO_RESULTS;
    try {
      rec.abort();
    } catch {
      // Already gone.
    }
  }

  /** Detach handlers first so a late event can never re-enter. */
  private detach(rec: RecognitionLike): void {
    rec.onstart = rec.onaudiostart = rec.onspeechstart = rec.onspeechend = rec.onend = null;
    rec.onresult = null;
    rec.onerror = null;
  }

  private windowTimer(fn: () => void, ms: number): unknown {
    const id = this.deps.setTimer(fn, ms);
    this.windowTimers.push(id);
    return id;
  }

  private finish(state: MicState, error: MicError | null, transcript = ''): void {
    this.set({ state, error, transcript, startedAt: null, supported: this.snap.supported && !this.disabled });
  }

  private set(patch: Partial<MicSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }
}
```

- [ ] **Step 3: Verify** — the test file passes; `npm run type-check` → 0.
- [ ] **Step 4: Commit** — `feat(n400app): persistent recognition session for iOS (spec D15)`.

---

### Task 3: `isIOSDevice`

**Files:** Modify `apps/website/src/lib/n400/oral/voice-support.ts`; Test `voice-support.test.ts`.

- [ ] **Step 1: Failing test** — append to `voice-support.test.ts` (and import `isIOSDevice`):

```ts
describe('isIOSDevice (spec D15)', () => {
  it('iPhone, and iPadOS that reports a Mac UA with touch', () => {
    expect(isIOSDevice(UA.iphoneSafari, 5)).toBe(true);
    expect(isIOSDevice(UA.fbIos, 5)).toBe(true);
    const ipadAsMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15';
    expect(isIOSDevice(ipadAsMac, 5)).toBe(true);
  });

  it('not Mac desktops or Android', () => {
    expect(isIOSDevice(UA.macChrome, 0)).toBe(false);
    expect(isIOSDevice(UA.androidChrome, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement** — append to `voice-support.ts`:

```ts
/** iPhone/iPod/iPad, including iPadOS that reports a Mac UA (touch points). Spec D15. */
export function isIOSDevice(ua: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}
```

- [ ] **Step 3: Verify + commit** — `feat(n400app): detect iOS devices for the persistent mic session`.

---

### Task 4: One controller per app layout

**Files:**
- Modify: `apps/website/src/lib/n400/oral/use-speech-recognition.ts`
- Create: `apps/website/src/components/n400/oral/VoiceMicProvider.tsx`
- Modify: `apps/website/src/app/n400ready/(app)/layout.tsx`
- Test: `apps/website/src/components/n400/oral/voice-mic-wiring.test.ts`

**Interfaces:**
- Produces: `createMicController(): MicController`; `MicControllerContext`; `SpeechApi` gains `persistent: boolean`; `VoiceMicProvider({ children })`.

- [ ] **Step 1: Failing wiring test** — create `voice-mic-wiring.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('mic session wiring (spec D15)', () => {
  it('the app layout owns one mic controller for every screen', () => {
    expect(read('src/app/n400ready/(app)/layout.tsx')).toContain('<VoiceMicProvider>');
  });

  it('a hidden tab never aborts a persistent session', () => {
    const provider = read('src/components/n400/oral/VoiceMicProvider.tsx');
    expect(provider).toContain("document.visibilityState === 'hidden' && !controller.persistent");
  });

  it('leaving a screen only resets its capture window', () => {
    expect(read('src/lib/n400/oral/use-speech-recognition.ts')).toContain('return () => shared.reset();');
  });

  it('iOS gets the persistent controller', () => {
    const hook = read('src/lib/n400/oral/use-speech-recognition.ts');
    expect(hook).toContain('isIOSDevice(navigator.userAgent');
    expect(hook).toContain('new PersistentSpeechController(deps)');
  });
});
```

Run → FAIL.

- [ ] **Step 2: Rewrite `use-speech-recognition.ts`** as:

```ts
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

const SERVER_SNAPSHOT: MicSnapshot = { supported: false, state: 'idle', transcript: '', error: null, startedAt: null };
const noopSubscribe = () => () => {};

export interface SpeechApi extends MicSnapshot {
  /** iOS persistent session (D15): the mic stays on between answers. */
  persistent: boolean;
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

  const start = useCallback(() => controller?.start(), [controller]);
  const stop = useCallback(() => controller?.stop(), [controller]);
  const reset = useCallback(() => controller?.reset(), [controller]);
  const persistent = controller?.persistent ?? false;

  return useMemo(() => ({ ...snap, persistent, start, stop, reset }), [snap, persistent, start, stop, reset]);
}
```

- [ ] **Step 3: Create `VoiceMicProvider.tsx`**:

```tsx
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
```

- [ ] **Step 4: Layout** — in `(app)/layout.tsx`, import `VoiceMicProvider` from `@/components/n400/oral/VoiceMicProvider` and wrap the top-level `<div className="flex h-dvh …">…</div>` in `<VoiceMicProvider>…</VoiceMicProvider>` (inside `N400LangProvider`).

- [ ] **Step 5: Verify** — wiring test passes; `npx vitest run src/lib/n400/oral src/components/n400/oral` passes; `npm run type-check` → 0; `npx eslint` on the changed files is clean.
- [ ] **Step 6: Commit** — `feat(n400app): one mic controller per app layout (iOS session survives screens)`.

---

### Task 5: UI — no reload advice; practice falls back to typing on `stalled`; iOS hint

**Files:** Modify `MicAnswerPanel.tsx`, `vi.ts`, `en.ts`, `practice/page.tsx`; Test `practice-voice-wiring.test.ts`.

- [ ] **Step 1: Failing wiring tests** — append to `src/components/n400/oral/practice-voice-wiring.test.ts`:

```ts
describe('practice voice wiring — rev 3.5', () => {
  const panel = readFileSync(join(process.cwd(), 'src/components/n400/oral/MicAnswerPanel.tsx'), 'utf8');

  it('never tells the learner to reload for the mic', () => {
    expect(panel).not.toContain('location.reload');
  });

  it('a stalled mic switches practice to the typed box', () => {
    expect(page).toContain("mic.error === 'stalled'");
    expect(page).toContain('setMicLost(true)');
    expect(page).toContain("const panelInput: 'mic' | 'typed' =");
  });

  it('explains the always-on mic on iPhone', () => {
    expect(panel).toContain('mic.persistent');
    expect(panel).toContain('t.hintPersistent');
  });
});
```

- [ ] **Step 2: Copy** — in `vi.ts` `oral`: remove `reload`, change `errStalled` to `'Micro đang không phản hồi. Bạn có thể gõ câu trả lời (hoặc bấm 🎤 trên bàn phím).'`, and add `hintPersistent: 'Trên iPhone, micro sẽ bật suốt khi bạn luyện nói; app chỉ lấy chữ khi bạn bấm nút micro.'`. In `en.ts`: remove `reload`; `errStalled: 'The microphone stopped responding. You can type the answer (or tap 🎤 on your keyboard).'`; `hintPersistent: 'On iPhone the microphone stays on while you practice speaking; the app only takes the words spoken after you tap the mic.'`.

- [ ] **Step 3: `MicAnswerPanel.tsx`**:
  - Delete the `{mic.error === 'stalled' ? ( <button … onClick={() => window.location.reload()} …>{t.reload}</button> ) : null}` block.
  - In the hint box, render `{t.hint}` followed by `{mic.persistent && input === 'mic' ? <span className="mt-1 block">{t.hintPersistent}</span> : null}` inside the same `<span className="flex-1">`.

- [ ] **Step 4: Practice page**:
  - Import `offersTypedFallback` from `@/lib/n400/oral/mock-voice-items`.
  - State (next to the other voice state): `const [micLost, setMicLost] = useState(false);`
  - After `revealedCorrect` is derived:

```ts
  // A stalled mic (deaf iOS session) → typed box for the rest of the page (spec §8, rev 3.5).
  if (!micLost && voiceHere && voiceInput === 'mic' && mic.error === 'stalled') setMicLost(true);
  const panelInput: 'mic' | 'typed' = voiceInput === 'typed' || micLost ? 'typed' : 'mic';
```

  - `settleVoice`: record with `panelInput === 'typed' ? 'typed' : 'voice'`.
  - `<MicAnswerPanel …>`: `input={panelInput}`, add `notice={micLost ? dict.oral.micLostTyped : undefined}` and `onUseTyped={panelInput === 'mic' && offersTypedFallback(mic.error) ? () => setMicLost(true) : undefined}`.
  - Feedback line: `{panelInput === 'typed' ? dict.oral.youTyped : dict.oral.youSaid}`.

- [ ] **Step 5: Verify** — wiring tests pass; `npx vitest run src/lib/n400 src/components/n400/oral` passes; type-check 0; eslint clean.
- [ ] **Step 6: Commit** — `feat(n400app): stalled mic falls back to typing in practice; iOS always-on hint`.

---

### Task 6: Gate, review, deploy, device check

- [ ] **Step 1:** `npm run type-check && npm run test && npm run build` → 0 / only the pre-existing failure / 0.
- [ ] **Step 2:** Whole-branch review with a fresh reviewer (executing-plans final review). Fix Critical/Important with a test that fails first.
- [ ] **Step 3:** Push to `main` (owner-approved fix loop) and wait for the Vercel deploy.
- [ ] **Step 4: Owner device check (iPhone Safari):**
  1. Practice → Tự nói: 5 answers in a row, no reload. The mic icon stays on, and every answer is heard.
  2. Nói lại on one question → heard.
  3. Switch Trắc nghiệm → Tự nói → answer → heard.
  4. Switch to another app for 10 s, come back, answer → heard.
  5. Leave practice for another screen and come back, answer → heard.
  6. Optional: `?oraldebug=1` shows `mode=persistent`.
  The mock by voice needs `voice_mock` ON for the tester; that's an owner decision.
