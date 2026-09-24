import { describe, expect, it } from 'vitest';
import { gradeVoiceMock, MAX_TRANSCRIPT, type VoiceMockAnswer } from './grade-voice-mock';

const TX = { stateCode: 'TX' as const, districtNumber: null };
const DC = { stateCode: 'DC' as const, districtNumber: null };
const manifest = [
  { qid: 2, correct: 'A' as const },
  { qid: 7, correct: 'B' as const },
];
const spoken = (qid: number, transcript: string, input: 'mic' | 'typed' = 'mic'): VoiceMockAnswer => ({
  qid,
  transcript,
  retried: false,
  input,
});

describe('gradeVoiceMock (spec §6, rev 3.4)', () => {
  it('grades transcripts on the server; near counts as wrong', () => {
    const { results } = gradeVoiceMock([spoken(2, 'the constitution'), spoken(7, 'twenty six')], manifest, TX);
    expect(results).toEqual([
      { qid: 2, was_correct: true, transcript: 'the constitution' },
      { qid: 7, was_correct: false, transcript: 'twenty six' },
    ]);
    expect(gradeVoiceMock([spoken(2, 'the institution')], manifest, TX).results[0].was_correct).toBe(false);
  });

  it('a choice for a gradable question is wrong', () => {
    const { results } = gradeVoiceMock([{ qid: 2, selected: 'A' }], manifest, TX);
    expect(results[0]).toEqual({ qid: 2, was_correct: false, transcript: null });
  });

  it('questions with no oral config are answered by choice against the manifest', () => {
    const dcManifest = [{ qid: 62, correct: 'C' as const }, { qid: 23, correct: 'A' as const }];
    const { results } = gradeVoiceMock(
      [{ qid: 62, selected: 'C' }, spoken(23, 'none')],
      dcManifest,
      DC,
    );
    expect(results).toEqual([
      { qid: 62, was_correct: true, transcript: null },
      { qid: 23, was_correct: false, transcript: null },
    ]);
  });

  it('missing manifest items are graded wrong', () => {
    const { results } = gradeVoiceMock([spoken(2, 'the constitution')], manifest, TX);
    expect(results).toHaveLength(2);
    expect(results[1]).toEqual({ qid: 7, was_correct: false, transcript: null });
  });

  it('ignores qids outside the manifest and keeps the first duplicate', () => {
    const { results } = gradeVoiceMock(
      [spoken(99, 'x'), spoken(2, 'the institution'), spoken(2, 'the constitution')],
      manifest,
      TX,
    );
    expect(results.map((r) => r.qid)).toEqual([2, 7]);
    expect(results[0].was_correct).toBe(false);
  });

  it('never throws on garbage input', () => {
    expect(gradeVoiceMock(null, manifest, TX).results.every((r) => !r.was_correct)).toBe(true);
    expect(gradeVoiceMock([null, 5, { qid: '2' }, { qid: 2, transcript: 42 }], manifest, TX).results).toEqual([
      { qid: 2, was_correct: false, transcript: null },
      { qid: 7, was_correct: false, transcript: null },
    ]);
  });

  it('trims and caps transcripts', () => {
    const long = `  the constitution ${'x'.repeat(MAX_TRANSCRIPT)}`;
    const t = gradeVoiceMock([spoken(2, long)], manifest, TX).results[0].transcript!;
    expect(t.length).toBe(MAX_TRANSCRIPT);
    expect(t.startsWith('the constitution')).toBe(true);
  });

  it('answer mode is voice if any mic item, else typed', () => {
    expect(gradeVoiceMock([spoken(2, 'a', 'typed'), spoken(7, 'b', 'mic')], manifest, TX).answerMode).toBe('voice');
    expect(gradeVoiceMock([spoken(2, 'a', 'typed')], manifest, TX).answerMode).toBe('typed');
  });

  it('the answer type carries no verdict (spec §6 invariant)', () => {
    // @ts-expect-error — VoiceMockAnswer must never accept a client verdict.
    const bad: VoiceMockAnswer = { qid: 2, transcript: 'x', retried: false, input: 'mic', was_correct: true };
    expect(bad).toBeDefined();
  });
});
