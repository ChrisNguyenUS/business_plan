// Framework-free Web Speech controller. The React hook (use-speech-recognition.ts)
// is a thin wrapper, so this logic is testable in node. Spec §4.1 (rev 3.3).

export type MicState = 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'transcript' | 'error';
export type MicError = 'no-speech' | 'not-allowed' | 'network' | 'audio-capture' | 'unavailable' | 'stalled';

export interface MicSnapshot {
  supported: boolean;
  state: MicState;
  transcript: string;
  error: MicError | null;
  /** Timestamp of the current start(); drives the 15 s ring. */
  startedAt: number | null;
}

/** Results list as WebKit/Chromium report it (continuous sessions accumulate). */
export type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;

/** The subset of SpeechRecognition this app uses. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechControllerDeps {
  /** null when the browser has no SpeechRecognition API. */
  create: (() => RecognitionLike) | null;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  /** Technical details for Sentry; never shown to the learner. */
  report?: (code: string, message?: string) => void;
  /** Persists "unavailable for this session" (sessionStorage in the hook). */
  markUnavailable?: () => void;
  /** Diagnostic event log (?oraldebug=1); never shown to learners by default. */
  log?: (event: string) => void;
  /** Already marked unavailable earlier this session. */
  unavailable?: boolean;
}

export const HARD_STOP_MS = 15_000;
export const STALL_MS = 7_000;
export const INSTANT_DENY_MS = 500;
export const END_GRACE_MS = 2_000;

const ERROR_MAP: Readonly<Record<string, MicError>> = {
  'no-speech': 'no-speech',
  network: 'network',
  'audio-capture': 'audio-capture',
};

/** Results from `from` joined with single spaces: Chrome's segments carry a leading
 *  space, but nothing guarantees it, and "Congress"+"president" must not fuse. */
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

export class SpeechController implements MicController {
  readonly persistent = false;
  private snap: MicSnapshot;
  private readonly listeners = new Set<() => void>();
  private rec: RecognitionLike | null = null;
  private startedAt = 0;
  private heardAudio = false;
  private heardSpeech = false;
  private text = '';
  private pendingError: MicError | null = null;
  private disabled = false;
  private stalledInRow = 0;
  private timers: unknown[] = [];
  private stallTimer: unknown = null;

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

  start(): void {
    const create = this.deps.create;
    if (!create || !this.snap.supported || this.rec) return;
    this.deps.log?.('start');
    let rec: RecognitionLike;
    try {
      rec = create();
    } catch (e) {
      this.deps.report?.('create-threw', String(e));
      this.finish('error', 'unavailable');
      return;
    }
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.rec = rec;
    this.startedAt = this.deps.now();
    this.heardAudio = false;
    this.heardSpeech = false;
    this.text = '';
    this.pendingError = null;

    rec.onstart = () => {
      this.deps.log?.('onstart');
      this.set({ state: 'listening' });
    };
    rec.onaudiostart = () => {
      this.deps.log?.('audiostart');
      this.heardAudio = true;
      if (!this.heardSpeech) this.stallTimer = this.timer(() => this.onStall(), STALL_MS);
    };
    rec.onspeechstart = () => {
      this.deps.log?.('speechstart');
      this.heard();
    };
    rec.onspeechend = () => {
      this.deps.log?.('speechend');
      this.set({ state: 'processing' });
    };
    rec.onresult = (e) => {
      this.heard();
      this.text = joinResultsFrom(e.results, 0);
      this.deps.log?.(`result "${this.text}"`);
      this.set({ transcript: this.text });
    };
    rec.onerror = (e) => this.onError(e.error, e.message);
    rec.onend = () => {
      this.deps.log?.('end');
      this.end();
    };

    this.timer(() => this.stop(), HARD_STOP_MS);
    this.set({ state: 'requesting_permission', transcript: '', error: null, startedAt: this.startedAt });
    try {
      rec.start();
    } catch (e) {
      this.deps.report?.('start-threw', String(e));
      this.teardown();
      this.finish('error', 'unavailable');
    }
  }

  /** Learner pressed Stop, or the 15 s hard stop. Waits briefly for onend. */
  stop(): void {
    const rec = this.rec;
    if (!rec) return;
    this.deps.log?.('stop');
    try {
      rec.stop();
    } catch {
      // Already stopping — the grace timer below still finishes the session.
    }
    this.timer(() => this.end(), END_GRACE_MS);
  }

  /** Tab hidden / unmount: drop everything, stay on the item (spec §8). */
  abort(): void {
    if (!this.rec) return;
    this.deps.log?.('abort');
    this.abortRec();
    this.finish('idle', null);
  }

  /** Release the mic entirely (MicController). Per-answer: same as abort. */
  shutdown(): void {
    this.abort();
  }

  reset(): void {
    if (this.rec) this.abortRec();
    this.finish('idle', null);
  }

  private heard(): void {
    this.heardSpeech = true;
    this.stalledInRow = 0;
    if (this.stallTimer !== null) {
      this.deps.clearTimer(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private onStall(): void {
    this.stallTimer = null;
    if (!this.rec || this.heardSpeech || this.text) return;
    this.stalledInRow += 1;
    this.deps.log?.(`stall in_row=${this.stalledInRow}`);
    this.deps.report?.('stall', `in_row=${this.stalledInRow}`);
    this.abortRec();
    this.finish('error', this.stalledInRow >= 2 ? 'stalled' : 'no-speech');
  }

  private onError(code: string, message?: string): void {
    this.deps.log?.(`error ${code}${message ? ` ${message}` : ''}`);
    const c = classifyMicError(code, this.heardAudio, this.deps.now() - this.startedAt);
    if (!c) return;
    if (c.disable) {
      this.disabled = true;
      this.deps.markUnavailable?.();
    }
    if (c.error !== 'no-speech') this.deps.report?.(code, message);
    if (this.pendingError === null) this.pendingError = c.error;
  }

  private end(): void {
    if (!this.rec) return;
    const err = this.pendingError;
    const text = this.text.trim();
    this.teardown();
    if (err) this.finish('error', err);
    else if (text) this.finish('transcript', null, text);
    else this.finish('error', 'no-speech');
  }

  private timer(fn: () => void, ms: number): unknown {
    const id = this.deps.setTimer(fn, ms);
    this.timers.push(id);
    return id;
  }

  /** Detach handlers and timers first so a late event can never re-enter. */
  private teardown(): void {
    for (const id of this.timers) this.deps.clearTimer(id);
    this.timers = [];
    this.stallTimer = null;
    const rec = this.rec;
    if (rec) {
      rec.onstart = rec.onaudiostart = rec.onspeechstart = rec.onspeechend = rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
    }
    this.rec = null;
  }

  private abortRec(): void {
    const rec = this.rec;
    this.teardown();
    try {
      rec?.abort();
    } catch {
      // Nothing to abort.
    }
  }

  private finish(state: MicState, error: MicError | null, transcript = ''): void {
    this.set({ state, error, transcript, startedAt: null, supported: this.snap.supported && !this.disabled });
  }

  private set(patch: Partial<MicSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }
}
