import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyYesNo, gradeYesNo, type YesNoIntent } from './yes-no-intent';

// Speaking spec §3.2. Prototyped 2026-09-25; every row below is a real phrasing.
const TABLE: [string, YesNoIntent][] = [
  ['No', 'no'], ['No, officer.', 'no'], ['No sir', 'no'], ["No ma'am", 'no'], ['Nope', 'no'], ['Nah', 'no'],
  ['Never', 'no'], ['No, never', 'no'], ['I have never been', 'no'], ['I have not', 'no'], ["I haven't", 'no'],
  ['No, I have not', 'no'], ['I have not been arrested', 'no'], ['I did not', 'no'], ["I didn't", 'no'],
  ['I am not', 'no'], ["I'm not", 'no'], ['I do not', 'no'], ["I don't", 'no'], ['Of course not', 'no'],
  ['Absolutely not', 'no'], ['Definitely not', 'no'], ['No I never did that', 'no'],
  ['Yes', 'yes'], ['Yes, officer', 'yes'], ['Yeah', 'yes'], ['Yep', 'yes'], ['Yeah I have', 'yes'], ['I did', 'yes'],
  ['I have', 'yes'], ['I am', 'yes'], ['I was', 'yes'], ['Of course', 'yes'], ['Correct', 'yes'], ['Yes I do', 'yes'],
  ["I don't know", 'unclear'], ['I do not know', 'unclear'], ['not sure', 'unclear'], ["I'm not sure", 'unclear'],
  ["I don't remember", 'unclear'], ['No idea', 'unclear'], ['Say again', 'unclear'], ['Can you repeat the question', 'unclear'],
  ['Yes no', 'unclear'], ['', 'unclear'], ['um', 'unclear'], ['Maybe', 'unclear'], ['Yes, I have not', 'unclear'],
  // S1 final review: not understanding / not hearing / not recalling is never an answer (spec §3.2 rule 1).
  ["I don't understand", 'unclear'], ['I do not understand the question', 'unclear'], ["sorry I don't understand", 'unclear'],
  ["I didn't understand", 'unclear'], ["I don't get it", 'unclear'], ["I didn't hear you", 'unclear'],
  ["I didn't catch that", 'unclear'], ["I can't hear you", 'unclear'], ["I don't recall", 'unclear'],
  ["I can't recall", 'unclear'], ["I'm not certain", 'unclear'], ['not really sure', 'unclear'],
  ["I'm not quite sure", 'unclear'], ['I am not so sure', 'unclear'], ["I don't think so", 'no'],
  // Spec §3.2 lists "sure" as affirmative.
  ['Sure', 'yes'],
];

describe('classifyYesNo (speaking spec §3.2)', () => {
  it.each(TABLE)('%j → %s', (said, intent) => {
    expect(classifyYesNo(said)).toBe(intent);
  });
});

describe('gradeYesNo', () => {
  it('matches the expected answer; unclear is never graded', () => {
    expect(gradeYesNo('No, officer', 'no')).toBe('correct');
    expect(gradeYesNo('Yes', 'no')).toBe('wrong');
    expect(gradeYesNo("I don't know", 'no')).toBe('unclear');
    expect(gradeYesNo('Yes I do', 'yes')).toBe('correct');
  });

  it('never uses the generic stall list, which drops "yes" (spec §3.2)', () => {
    // The stall list lives in normalize.ts; importing nothing from it keeps it out.
    const src = readFileSync(join(process.cwd(), 'src/lib/n400/oral/yes-no-intent.ts'), 'utf8');
    expect(src).not.toMatch(/from '\.\/normalize'/);
  });
});
