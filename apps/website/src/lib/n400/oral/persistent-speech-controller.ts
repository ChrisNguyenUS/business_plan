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
/** An unfinished result counts as the learner's first words only if it began this recently before the tap. */
export const EARLY_WORDS_MS = 1_000;

const NO_RESULTS: RecognitionResultList = [];

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
  /** Any non-empty result in this session: a heard session is never treated as deaf. */
  private sessionHeard = false;
  /** When each result index first appeared (for EARLY_WORDS_MS). */
  private seenAt: number[] = [];
  /** Results below this index belong to earlier windows or pre-tap speech. */
  private minFrom = 0;
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

  /** 🔊 is about to play. Logged only: playback sometimes leaves the session
   *  hearing, sometimes stops its capture until WebKit ends it ("audio-capture:
   *  Source is stopped"), and a session the app aborts is followed by a deaf one,
   *  so the session is always kept (device logs 2026-09-25, spec rev 3.8). */
  noteAudioPlayed(): void {
    this.deps.log?.(this.rec ? 'audio played (session kept)' : 'audio played (no session)');
  }

  /** Learner tapped Stop: close the window with what it heard. The session stays. */
  stop(): void {
    if (!this.windowOpen) return;
    this.deps.log?.('stop');
    this.closeWindow();
  }

  /** New question / Nói lại / leaving a screen: drop the window, keep the session. */
  reset(): void {
    const had = this.windowOpen;
    this.discardWindow();
    if (this.rec && had) this.armIdle();
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
    this.sessionHeard = false;
    this.seenAt = [];
    this.minFrom = 0;
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
    this.windowFrom = newSession ? 0 : this.windowStart();
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

  /** Exclude earlier windows and pre-tap speech; keep an utterance begun just before the tap. */
  private windowStart(): number {
    const n = this.results.length;
    const last = n - 1;
    if (
      last >= this.minFrom &&
      this.results[last]?.isFinal !== true &&
      this.deps.now() - (this.seenAt[last] ?? 0) <= EARLY_WORDS_MS
    ) {
      return last;
    }
    return Math.max(n, this.minFrom);
  }

  private onResult(results: RecognitionResultList): void {
    const now = this.deps.now();
    for (let i = this.seenAt.length; i < results.length; i++) this.seenAt[i] = now;
    this.results = results;
    if (joinResultsFrom(results, 0)) this.sessionHeard = true;
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
    if (this.sessionHeard) {
      this.stalledInRow = 0;
      if (this.rec) this.armIdle();
      this.finish('error', 'no-speech');
      return;
    }
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
    if (!text && !err && this.rec && !this.sessionHeard) {
      this.onStall();
      return;
    }
    this.discardWindow();
    if (this.rec) this.armIdle();
    this.deps.log?.(`window close${err ? ` error=${err}` : ''}`);
    if (err) this.finish('error', err);
    else if (text) this.finish('transcript', null, text);
    else this.finish('error', 'no-speech');
  }

  private discardWindow(): void {
    if (this.windowOpen) this.minFrom = this.results.length;
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
