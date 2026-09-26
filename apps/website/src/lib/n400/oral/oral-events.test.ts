import { describe, expect, it } from 'vitest';
import type { VoiceItem } from './mock-voice-items';
import { micErrorEvent, mockAnswerEvents, practiceAnswerEvent } from './oral-events';

const said = (transcript: string, retried = false, input: 'mic' | 'typed' = 'mic'): VoiceItem => ({
  transcript,
  retried,
  input,
  confirmed: true,
});

describe('practiceAnswerEvent', () => {
  it('carries the verdict, the near answer and only the transcript length', () => {
    expect(practiceAnswerEvent(69, 'mic', 'near', true, 'vote and write')).toEqual({
      qid: 69,
      section: 'civics',
      context: 'practice',
      input: 'mic',
      verdict: 'near',
      retried: null,
      confirmedNear: true,
      error: 'none',
      transcriptLength: 14,
    });
  });
});

describe('micErrorEvent', () => {
  // Final review: the micLost latch re-renders before the effect runs, so
  // taking the input from the page labelled fatal mic errors 'typed'.
  it('has no verdict and no transcript, and always comes from the mic', () => {
    expect(micErrorEvent(12, 'mock', 'not-allowed')).toEqual({
      qid: 12,
      section: 'civics',
      context: 'mock',
      input: 'mic',
      verdict: 'none',
      retried: null,
      confirmedNear: null,
      error: 'not-allowed',
      transcriptLength: 0,
    });
  });
});

describe('mockAnswerEvents', () => {
  it('one event per spoken item, verdict from the server', () => {
    const events = mockAnswerEvents([21, 22], [said('100'), said('six years', true)], [
      { qid: 21, wasCorrect: true },
      { qid: 22, wasCorrect: false },
    ]);
    expect(events.map((e) => [e.qid, e.context, e.verdict, e.retried, e.transcriptLength])).toEqual([
      [21, 'mock', 'correct', false, 3],
      [22, 'mock', 'wrong', true, 9],
    ]);
  });

  it('multiple-choice items inside a voice mock send nothing (Review Focus 2)', () => {
    const events = mockAnswerEvents([23, 21], [null, said('100')], [
      { qid: 23, wasCorrect: true },
      { qid: 21, wasCorrect: true },
    ]);
    expect(events.map((e) => e.qid)).toEqual([21]);
  });

  it('typed items are marked typed (Review Focus 3)', () => {
    const [e] = mockAnswerEvents([21], [said('100', false, 'typed')], [{ qid: 21, wasCorrect: true }]);
    expect(e.input).toBe('typed');
  });

  it('an item the server did not return sends nothing', () => {
    expect(mockAnswerEvents([21], [said('100')], [])).toEqual([]);
  });
});

describe('Speaking sections (speaking spec §8)', () => {
  it('practice events carry the item section and allow unclear', () => {
    expect(practiceAnswerEvent(3, 'mic', 'unclear', null, "I don't know", 'yesno')).toMatchObject({
      qid: 3,
      section: 'yesno',
      verdict: 'unclear',
    });
  });

  it('mic errors and mock answers default to civics', () => {
    expect(micErrorEvent(12, 'practice', 'no-speech', 'whatmean').section).toBe('whatmean');
    expect(mockAnswerEvents([21], [said('100')], [{ qid: 21, wasCorrect: true }])[0].section).toBe('civics');
  });
});
