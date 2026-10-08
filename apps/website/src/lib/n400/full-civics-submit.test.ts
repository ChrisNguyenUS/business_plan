import { describe, expect, it } from 'vitest';
import {
  fullCivicsSubmission,
  serverVerdicts,
  startCivicsSave,
  type FullCivicsInput,
} from './full-civics-submit';
import type { SpokenMockAnswer } from './oral/spoken-mock';

const spoken = (transcript: string, input: 'mic' | 'typed' = 'mic'): SpokenMockAnswer => ({
  transcript,
  retried: false,
  input,
  confirmed: true,
  reask: false,
});

describe('fullCivicsSubmission (RLS hardening spec §2.4, Review Focus 3)', () => {
  it('a voice run sends words by question id, multiple choice as a pick, and skips an empty item', () => {
    const inputs: FullCivicsInput[] = [
      { questionId: 12, spoken: spoken('freedom of speech') },
      { questionId: 29, selectedId: 'B' },
      { questionId: 3, spoken: spoken('the constitution', 'typed') },
      { questionId: 7 },
    ];
    expect(fullCivicsSubmission('voice', inputs)).toEqual({
      mode: 'voice',
      answers: [
        { qid: 12, transcript: 'freedom of speech', retried: false, input: 'mic' },
        { qid: 29, selected: 'B' },
        { qid: 3, transcript: 'the constitution', retried: false, input: 'typed' },
      ],
    });
  });

  it('a choice run sends the answered picks only (Review Focus 4)', () => {
    expect(
      fullCivicsSubmission('choice', [
        { questionId: 1, selectedId: 'A' },
        { questionId: 2 },
        { questionId: 3, selectedId: 'C' },
      ]),
    ).toEqual({
      mode: 'choice',
      picks: [
        { questionId: 1, selectedOption: 'A' },
        { questionId: 3, selectedOption: 'C' },
      ],
    });
  });
});

describe('serverVerdicts', () => {
  it('a choice run is graded against the server answer key', () => {
    const submission = fullCivicsSubmission('choice', [
      { questionId: 1, selectedId: 'A' },
      { questionId: 3, selectedId: 'C' },
    ]);
    const verdicts = serverVerdicts(submission, { manifest: [{ qid: 1, correct: 'A' }, { qid: 3, correct: 'D' }] });
    expect([...verdicts]).toEqual([[1, true], [3, false]]);
  });

  it('a voice run takes the server verdict per question', () => {
    const submission = fullCivicsSubmission('voice', [{ questionId: 12, spoken: spoken('x') }]);
    const verdicts = serverVerdicts(submission, {
      manifest: [{ qid: 12, correct: 'A' }, { qid: 29, correct: 'B' }],
      answers: [{ qid: 12, wasCorrect: true }, { qid: 29, wasCorrect: false }],
    });
    expect([...verdicts]).toEqual([[12, true], [29, false]]);
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

function harness() {
  const calls: ReturnType<typeof deferred<string>>[] = [];
  const statuses: string[] = [];
  const saver = startCivicsSave(
    () => {
      const d = deferred<string>();
      calls.push(d);
      return d.promise;
    },
    (status, result) => statuses.push(result === undefined ? status : `${status}:${result}`),
  );
  return { calls, statuses, saver };
}

describe('startCivicsSave (Review Focus 1, 4)', () => {
  it('saves once in the background; a summary after success does nothing', async () => {
    const h = harness();
    expect(h.statuses).toEqual(['saving']);
    h.calls[0].resolve('ok');
    await flush();
    h.saver.retryIfFailed();
    await flush();
    expect(h.statuses).toEqual(['saving', 'saved:ok']);
    expect(h.calls).toHaveLength(1);
  });

  it('a failure before the summary waits; opening the summary retries once', async () => {
    const h = harness();
    h.calls[0].reject(new Error('offline'));
    await flush();
    expect(h.statuses).toEqual(['saving', 'failed']);
    h.saver.retryIfFailed();
    expect(h.calls).toHaveLength(2);
    h.calls[1].resolve('ok');
    await flush();
    expect(h.statuses).toEqual(['saving', 'failed', 'saving', 'saved:ok']);
  });

  it('a second failure leaves the part unsaved and never tries a third time', async () => {
    const h = harness();
    h.calls[0].reject(new Error('x'));
    await flush();
    h.saver.retryIfFailed();
    h.calls[1].reject(new Error('y'));
    await flush();
    h.saver.retryIfFailed();
    await flush();
    expect(h.calls).toHaveLength(2);
    expect(h.statuses.at(-1)).toBe('unsaved');
  });

  it('a save still running when the summary opens is awaited, then retried once if it fails', async () => {
    const h = harness();
    h.saver.retryIfFailed();
    expect(h.calls).toHaveLength(1);
    h.calls[0].reject(new Error('x'));
    await flush();
    expect(h.calls).toHaveLength(2);
    h.calls[1].resolve('ok');
    await flush();
    expect(h.statuses.at(-1)).toBe('saved:ok');
  });
});
