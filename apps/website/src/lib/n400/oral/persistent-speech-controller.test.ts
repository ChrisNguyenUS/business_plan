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
