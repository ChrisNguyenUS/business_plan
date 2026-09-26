import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS } from '@/lib/n400/whatmean-data';
import { YESNO_QUESTIONS } from '@/lib/n400/yesno-data';
import { canSpeak, gradeSpokenItem, type SpokenItem } from './grade-spoken-item';
import { gradeSpokenMock, mockConfirm, mockRetry, type SpokenMockAnswer } from './spoken-mock';

// Speaking spec §5.1, §10. Runs on the real S1 grader.
const LOC = { stateCode: 'TX' as const, districtNumber: null };
const YN: SpokenItem = { kind: 'yesno', id: 'yn-1' };
const WM: SpokenItem = { kind: 'whatmean', id: 'wm-47' };
const confirm = (prev: SpokenMockAnswer | null, item: SpokenItem, text: string, input: 'mic' | 'typed' = 'mic') =>
  mockConfirm(prev, text, input, gradeSpokenItem(item, text, LOC).verdict);

describe('mockConfirm / mockRetry (Review Focus 1)', () => {
  it('"I don\'t know" is asked again: nothing locks and the retry is kept', () => {
    const reasked = confirm(null, YN, "I don't know");
    expect(reasked).toEqual({ transcript: '', retried: false, input: 'mic', confirmed: false, reask: true });
    expect(confirm(reasked, YN, 'No, officer')).toEqual({
      transcript: 'No, officer',
      retried: false,
      input: 'mic',
      confirmed: true,
      reask: false,
    });
  });

  it('[Nói lại] is used once; a re-ask after it neither restores nor spends it', () => {
    const retried = mockRetry('mic');
    expect(retried).toEqual({ transcript: '', retried: true, input: 'mic', confirmed: false, reask: false });
    expect(confirm(retried, YN, 'Maybe')).toMatchObject({ retried: true, confirmed: false, reask: true });
    expect(confirm(retried, YN, 'No')).toMatchObject({ retried: true, confirmed: true, reask: false });
  });

  it('a confirmed answer never changes', () => {
    const locked = confirm(null, YN, 'No, officer');
    expect(confirm(locked, YN, 'Yes')).toBe(locked);
  });

  it('a What-mean answer is not graded before the finish: any words lock (Review Focus 4)', () => {
    expect(confirm(null, WM, 'The marriage was cancelled')).toMatchObject({
      transcript: 'The marriage was cancelled',
      confirmed: true,
      reask: false,
    });
  });
});

describe('gradeSpokenMock (Review Focus 4)', () => {
  it('grades at the finish; near counts as wrong (D8); an unanswered or unknown item is wrong', () => {
    const items: (SpokenItem | null)[] = [YN, WM, { kind: 'yesno', id: 'yn-2' }, null];
    const answers = [confirm(null, YN, 'No, officer'), confirm(null, WM, 'The marriage was cancelled'), null, null];
    expect(gradeSpokenMock(items, answers, LOC)).toEqual({ ok: [true, false, false, false], score: 1, answerMode: 'voice' });
  });

  it("the run is 'voice' when any answer came from the mic, else 'typed'", () => {
    const typed = [confirm(null, YN, 'No', 'typed'), confirm(null, YN, 'No', 'typed')];
    expect(gradeSpokenMock([YN, YN], typed, LOC).answerMode).toBe('typed');
    const mixed = [confirm(null, YN, 'No', 'typed'), confirm(null, YN, 'No', 'mic')];
    expect(gradeSpokenMock([YN, YN], mixed, LOC).answerMode).toBe('voice');
  });

  it('every Speaking mock item can be spoken, so a voice run never mixes in multiple choice', () => {
    for (const q of WHATMEAN_QUESTIONS) expect(canSpeak({ kind: 'whatmean', id: q.id }, LOC)).toBe(true);
    for (const q of YESNO_QUESTIONS) expect(canSpeak({ kind: 'yesno', id: q.id }, LOC)).toBe(true);
  });
});
