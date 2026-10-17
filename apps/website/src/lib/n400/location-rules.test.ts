import { describe, expect, it } from 'vitest';
import { NON_STATE_CODES, locationRuleAnswer } from './location-rules';

describe('locationRuleAnswer (USCIS notes for D.C. and territories)', () => {
  it('has no rule for the 50 states', () => {
    for (const id of [23, 29, 61, 62]) expect(locationRuleAnswer(id, 'TX')).toBeNull();
  });

  it('D.C. has no senators, no governor, no capital', () => {
    expect(locationRuleAnswer(23, 'DC')).toMatchObject({ en: 'D.C. has no U.S. senators', vi: 'D.C. không có thượng nghị sĩ Hoa Kỳ' });
    expect(locationRuleAnswer(61, 'DC')).toMatchObject({ en: 'D.C. does not have a governor', vi: 'D.C. không có thống đốc' });
    expect(locationRuleAnswer(62, 'DC')).toMatchObject({
      en: 'D.C. is not a state and does not have a capital',
      vi: 'D.C. không phải tiểu bang nên không có thủ phủ',
    });
  });

  it('territories have no senators but keep their governor and capital', () => {
    expect(locationRuleAnswer(23, 'GU')).toMatchObject({ en: 'Guam has no U.S. senators', vi: 'Guam không có thượng nghị sĩ Hoa Kỳ' });
    expect(locationRuleAnswer(61, 'GU')).toBeNull();
    expect(locationRuleAnswer(62, 'PR')).toBeNull();
  });

  it('never applies to Q29 (delegates live in reps-data)', () => {
    for (const code of NON_STATE_CODES) expect(locationRuleAnswer(29, code)).toBeNull();
  });
});
