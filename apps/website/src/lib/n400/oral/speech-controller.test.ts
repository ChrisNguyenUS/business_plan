import { describe, expect, it } from 'vitest';
import {
  END_GRACE_MS,
  HARD_STOP_MS,
  STALL_MS,
  SpeechController,
  type RecognitionLike,
  type SpeechControllerDeps,
} from './speech-controller';

class FakeRec implements RecognitionLike {
  lang = '';
  continuous = true;
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
  throwOnStart = false;
  start() {
    if (this.throwOnStart) throw new Error('InvalidStateError');
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {
    this.aborted++;
  }
  result(...segments: string[]) {
    this.onresult?.({ results: segments.map((t) => [{ transcript: t }]) });
  }
  error(code: string) {
    this.onerror?.({ error: code });
  }
}

function harness(extra: Partial<SpeechControllerDeps> = {}, rec?: () => FakeRec) {
  let t = 1_000;
  let seq = 0;
  let timers: { id: number; at: number; fn: () => void }[] = [];
  const recs: FakeRec[] = [];
  const reports: string[] = [];
  let marked = 0;
  const c = new SpeechController({
    create: () => {
      const r = rec ? rec() : new FakeRec();
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
    report: (code) => {
      reports.push(code);
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
  return { c, recs, rec: () => recs[recs.length - 1], advance, reports, marked: () => marked, s: () => c.getSnapshot() };
}

/** start → onstart → audiostart → speechstart: a normal, live session. */
function live(h: ReturnType<typeof harness>) {
  h.c.start();
  h.rec().onstart?.();
  h.rec().onaudiostart?.();
  h.rec().onspeechstart?.();
}

describe('SpeechController — support', () => {
  it('is unsupported without the API and start() does nothing', () => {
    const h = harness({ create: null });
    expect(h.s().supported).toBe(false);
    h.c.start();
    expect(h.s().state).toBe('idle');
  });

  it('is unsupported when marked unavailable earlier this session', () => {
    expect(harness({ unavailable: true }).s().supported).toBe(false);
  });
});

describe('SpeechController — happy path', () => {
  it('configures the recognizer per spec §4.1', () => {
    const h = harness();
    h.c.start();
    expect(h.rec()).toMatchObject({ lang: 'en-US', continuous: false, interimResults: true, maxAlternatives: 1, started: 1 });
    expect(h.s()).toMatchObject({ state: 'requesting_permission', startedAt: 1_000 });
  });

  it('listening → interim transcript → processing → transcript on end', () => {
    const h = harness();
    live(h);
    expect(h.s().state).toBe('listening');
    h.rec().result('The con');
    expect(h.s()).toMatchObject({ state: 'listening', transcript: 'The con' });
    h.rec().result('The constitution');
    h.rec().onspeechend?.();
    expect(h.s().state).toBe('processing');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'The constitution', error: null, startedAt: null });
  });

  it('joins Chrome-style segments, including a final that arrives after speechend', () => {
    const h = harness();
    live(h);
    h.rec().onspeechend?.();
    h.rec().result('Congress president', ' and the courts');
    h.rec().onend?.();
    expect(h.s().transcript).toBe('Congress president and the courts');
  });

  it('separates segments that arrive without leading spaces', () => {
    const h = harness();
    live(h);
    h.rec().result('Congress', 'president', ' and the courts');
    h.rec().onend?.();
    expect(h.s().transcript).toBe('Congress president and the courts');
  });

  it('onend without text is no-speech, never a grade (D9)', () => {
    const h = harness();
    live(h);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: 'no-speech', transcript: '' });
  });

  it('a second start while running is ignored', () => {
    const h = harness();
    live(h);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('stop() asks the recognizer to stop', () => {
    const h = harness();
    live(h);
    h.c.stop();
    expect(h.rec().stopped).toBe(1);
  });

  it('reset() returns to idle and clears the transcript', () => {
    const h = harness();
    live(h);
    h.rec().result('27');
    h.rec().onend?.();
    h.c.reset();
    expect(h.s()).toMatchObject({ state: 'idle', transcript: '', error: null });
  });
});

describe('SpeechController — errors', () => {
  it.each([
    ['network', 'network'],
    ['audio-capture', 'audio-capture'],
    ['language-not-supported', 'unavailable'],
  ])('%s → %s, reported, still supported', (code, expected) => {
    const h = harness();
    live(h);
    h.rec().error(code);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: expected, supported: true });
    expect(h.reports).toContain(code);
  });

  it('recognizer no-speech is not reported to Sentry', () => {
    const h = harness();
    live(h);
    h.rec().error('no-speech');
    h.rec().onend?.();
    expect(h.s().error).toBe('no-speech');
    expect(h.reports).toEqual([]);
  });

  it('instant not-allowed with no audio means unavailable for the session', () => {
    const h = harness();
    h.c.start();
    h.advance(20);
    h.rec().error('not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'error', error: 'unavailable', supported: false });
    expect(h.marked()).toBe(1);
    h.c.start();
    expect(h.recs).toHaveLength(1);
  });

  it('service-not-allowed is unavailable whenever it comes', () => {
    const h = harness();
    live(h);
    h.advance(3_000);
    h.rec().error('service-not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ error: 'unavailable', supported: false });
  });

  it('not-allowed after a real prompt stays not-allowed', () => {
    const h = harness();
    h.c.start();
    h.advance(3_000);
    h.rec().error('not-allowed');
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ error: 'not-allowed', supported: true });
    expect(h.marked()).toBe(0);
  });

  it('start() throwing becomes unavailable without disabling voice', () => {
    const h = harness({}, () => Object.assign(new FakeRec(), { throwOnStart: true }));
    h.c.start();
    expect(h.s()).toMatchObject({ state: 'error', error: 'unavailable', supported: true });
    expect(h.reports).toContain('start-threw');
  });
});

describe('SpeechController — stall detector (Gate 0: iOS mic-dead)', () => {
  it('a stall reports no-speech, then stalled on the second in a row', () => {
    const h = harness();
    h.c.start();
    h.rec().onstart?.();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'no-speech' });
    expect(h.recs[0].aborted).toBe(1);

    h.c.start();
    h.rec().onstart?.();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s()).toMatchObject({ state: 'error', error: 'stalled' });
  });

  it('hearing speech resets the stall count', () => {
    const h = harness();
    h.c.start();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    live(h);
    h.rec().result('27');
    h.rec().onend?.();
    h.c.start();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(h.s().error).toBe('no-speech');
  });

  it('does not fire once speech has started', () => {
    const h = harness();
    live(h);
    h.advance(STALL_MS + 1_000);
    expect(h.s().state).toBe('listening');
  });
});

describe('SpeechController — hard stop and abort', () => {
  it('stops at 15 s and keeps what was heard', () => {
    const h = harness();
    live(h);
    h.rec().result('checks and balances');
    h.advance(HARD_STOP_MS);
    expect(h.rec().stopped).toBe(1);
    h.rec().onend?.();
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'checks and balances' });
  });

  it('finishes even if onend never comes after the hard stop', () => {
    const h = harness();
    live(h);
    h.rec().result('the constitution');
    h.advance(HARD_STOP_MS + END_GRACE_MS);
    expect(h.s()).toMatchObject({ state: 'transcript', transcript: 'the constitution' });
  });

  it('abort finishes immediately and ignores late events', () => {
    const h = harness();
    live(h);
    h.rec().result('27');
    const r = h.rec();
    h.c.abort();
    expect(h.s()).toMatchObject({ state: 'idle', transcript: '' });
    expect(r.aborted).toBe(1);
    expect(r.onend).toBeNull();
    expect(r.onresult).toBeNull();
  });

  it('notifies subscribers on every change', () => {
    const h = harness();
    let calls = 0;
    const off = h.c.subscribe(() => {
      calls++;
    });
    h.c.start();
    h.rec().onstart?.();
    off();
    h.rec().onaudiostart?.();
    h.rec().onspeechend?.();
    expect(calls).toBe(2);
  });
});

describe('SpeechController — debug log (iPhone diagnosis)', () => {
  it('logs every recognizer event in order', () => {
    const events: string[] = [];
    const h = harness({ log: (e) => events.push(e) });
    live(h);
    h.rec().result('27');
    h.rec().onspeechend?.();
    h.rec().onend?.();
    expect(events).toEqual(['start', 'onstart', 'audiostart', 'speechstart', 'result "27"', 'speechend', 'end']);
  });

  it('logs errors, stalls and aborts', () => {
    const events: string[] = [];
    const h = harness({ log: (e) => events.push(e) });
    h.c.start();
    h.rec().onaudiostart?.();
    h.advance(STALL_MS);
    expect(events).toContain('stall in_row=1');
    live(h);
    h.rec().error('network');
    h.c.abort();
    expect(events).toEqual(expect.arrayContaining(['error network', 'abort']));
  });
});
