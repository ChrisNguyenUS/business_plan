import { describe, expect, it } from 'vitest';
import { NON_STATE_CODES, VACANT_HOUSE_SEATS, locationRuleAnswer } from './location-rules';
import { repForDistrict } from './reps-data';

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

describe('vacant House seats (Q29)', () => {
  it('teaches that FL-20 and TX-23 are vacant', () => {
    for (const [code, d] of [['FL', 20], ['TX', 23]] as const) {
      expect(locationRuleAnswer(29, code, d)).toMatchObject({
        en: 'The seat is vacant (no representative right now)',
        vi: 'Ghế này đang trống (hiện chưa có dân biểu)',
      });
    }
  });

  it('leaves filled districts and an unknown district alone', () => {
    expect(locationRuleAnswer(29, 'TX', 29)).toBeNull();
    expect(locationRuleAnswer(29, 'TX', null)).toBeNull();
    expect(locationRuleAnswer(29, 'TX')).toBeNull();
  });

  it('a vacant seat has no rep in reps-data (no stale name, no stale audio)', () => {
    for (const key of VACANT_HOUSE_SEATS) {
      const [code, d] = key.split('-');
      expect(repForDistrict(code as 'FL', Number(d))).toBeNull();
    }
  });
});
