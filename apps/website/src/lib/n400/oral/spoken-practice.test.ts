import { describe, expect, it } from 'vitest';
import { sectionAttemptRow } from '@/lib/n400/attempt-row';
import { WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { gradeSpokenItem, type SpokenItem } from './grade-spoken-item';
import {
  afterAttempt,
  afterNearAnswer,
  answerFor,
  freshAnswer,
  isLocked,
  spokenInput,
  spokenPracticeStep,
  spokenQid,
  spokenSection,
  type SpokenAnswer,
} from './spoken-practice';
import { voiceInputFor } from './voice-support';

// Speaking spec §4 (rev 1.1). The sequences run on the real S1 grader.
const LOC = { stateCode: 'TX' as const, districtNumber: null };
const YN: SpokenItem = { kind: 'yesno', id: 'yn-1' };
const WM: SpokenItem = { kind: 'whatmean', id: 'wm-47' };
const attempt = (a: SpokenAnswer, item: SpokenItem, text: string) =>
  afterAttempt(a, text, gradeSpokenItem(item, text, LOC));

describe('Yes/No answer sequences (Review Focus 3)', () => {
  it('"I don\'t know" re-asks and leaves the item open; then "No, officer" is correct and recorded', () => {
    const reasked = attempt(freshAnswer('yn-1'), YN, "I don't know");
    expect(reasked).toMatchObject({ verdict: null, reask: true, text: "I don't know" });
    expect(isLocked(reasked)).toBe(false);
    expect(spokenPracticeStep(reasked)).toEqual({ settle: false, shownCorrect: false, record: null });

    const answered = attempt(reasked, YN, 'No, officer');
    expect(answered).toMatchObject({ verdict: 'correct', reask: false });
    expect(spokenPracticeStep(answered)).toEqual({ settle: true, shownCorrect: true, record: true });
  });

  it('"I don\'t know" then "Yes" is wrong and recorded (every Yes/No standard answer is No)', () => {
    const answered = attempt(attempt(freshAnswer('yn-1'), YN, "I don't know"), YN, 'Yes');
    expect(answered).toMatchObject({ verdict: 'wrong', reask: false });
    expect(spokenPracticeStep(answered)).toEqual({ settle: true, shownCorrect: false, record: false });
  });

  it('a graded item is never graded again', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(attempt(graded, YN, 'Yes')).toBe(graded);
  });
});

describe('What-mean near (D7)', () => {
  // Gate S1: "cancelled" without "never happened" stays near for wm-47.
  const near = attempt(freshAnswer('wm-47'), WM, 'The marriage was cancelled');

  it('waits for "Có phải bạn nói …?" with the taught definition; nothing settles yet', () => {
    expect(near).toMatchObject({ verdict: 'near', nearPrompt: WHATMEAN_QUESTIONS_BY_ID['wm-47'].definitionEn });
    expect(isLocked(near)).toBe(true);
    expect(spokenPracticeStep(near)).toEqual({ settle: false, shownCorrect: false, record: null });
  });

  it('"Đúng vậy" shows correct and records nothing; a second answer is ignored', () => {
    const confirmed = afterNearAnswer(near, true);
    expect(spokenPracticeStep(confirmed)).toEqual({ settle: true, shownCorrect: true, record: null });
    expect(afterNearAnswer(confirmed, false)).toBe(confirmed);
  });

  it('"Không" is wrong and recorded', () => {
    expect(spokenPracticeStep(afterNearAnswer(near, false))).toEqual({ settle: true, shownCorrect: false, record: false });
  });

  it('only a near waits for "Có phải bạn nói …?"', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(afterNearAnswer(graded, true)).toBe(graded);
  });
});

describe('items (plan review P0-1)', () => {
  it('a new item starts clean; the same item keeps its answer', () => {
    const graded = attempt(freshAnswer('yn-1'), YN, 'No, officer');
    expect(answerFor(graded, 'yn-2')).toEqual(freshAnswer('yn-2'));
    expect(answerFor(graded, 'yn-1')).toBe(graded);
  });

  it('an answer holds no answer mode, so Tự nói carries across items (Review Focus 4)', () => {
    expect(Object.keys(freshAnswer('yn-1'))).not.toContain('answerMode');
  });
});

describe('spokenInput: how an answer is taken and recorded (plan review P1-4)', () => {
  // The Facebook iOS in-app UA from voice-support.test.ts.
  const FB_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]';

  it('Facebook in-app iOS: the typed box, recorded as answer_mode typed', () => {
    const voiceInput = voiceInputFor({ ua: FB_IOS, apiPresent: true, enabled: true, androidOn: false });
    const { panelInput, via } = spokenInput(voiceInput, false);
    expect([voiceInput, panelInput, via]).toEqual(['typed', 'typed', 'typed']);
    expect(sectionAttemptRow('u1', 'yesno', 'yn-1', true, 'practice', via)).toMatchObject({ answer_mode: 'typed' });
  });

  it('the mic records voice; a lost mic types for the rest of the session', () => {
    expect(spokenInput('mic', false)).toEqual({ panelInput: 'mic', via: 'voice' });
    expect(spokenInput('mic', true)).toEqual({ panelInput: 'typed', via: 'typed' });
  });
});

describe('analytics ids', () => {
  it('spokenQid is the civics qid or the n of wm-n / yn-n', () => {
    expect(spokenQid({ kind: 'civics', qid: 12 })).toBe(12);
    expect(spokenQid({ kind: 'whatmean', id: 'wm-52' })).toBe(52);
    expect(spokenQid({ kind: 'yesno', id: 'yn-7' })).toBe(7);
  });

  it('spokenSection is the item kind', () => {
    expect(spokenSection({ kind: 'civics', qid: 1 })).toBe('civics');
    expect(spokenSection({ kind: 'whatmean', id: 'wm-1' })).toBe('whatmean');
    expect(spokenSection({ kind: 'yesno', id: 'yn-1' })).toBe('yesno');
  });
});
