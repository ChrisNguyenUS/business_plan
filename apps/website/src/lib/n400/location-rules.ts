// USCIS 2025 civics test (M-1778) notes for places that are not states:
// D.C. and territory residents have no U.S. senators (Q23); D.C. has no
// governor (Q61) and, not being a state, no capital (Q62). Territories keep
// their governor and name their capital; Q29 delegates are in reps-data.
import { STATES_BY_CODE, type StateCode } from './state-data';

export const NON_STATE_CODES: ReadonlySet<StateCode> = new Set<StateCode>(['AS', 'DC', 'GU', 'MP', 'PR', 'VI']);

// House seats with nobody in them (clerk.house.gov, checked 2026-11-04):
// FL-20 since Sheila Cherfilus-McCormick resigned 2026-04-21, TX-23 since
// Tony Gonzales resigned 2026-04-14. Their rows are gone from reps-2025.csv;
// the winners of the 2026-11-03 election take the seats on 2027-01-03.
// Key = `${stateCode}-${districtNumber}`, as in reps-data and verify-officials.
export const VACANT_HOUSE_SEATS: ReadonlySet<string> = new Set(['FL-20', 'TX-23']);

export function isVacantHouseSeat(code: StateCode, districtNumber: number | null): boolean {
  return districtNumber !== null && VACANT_HOUSE_SEATS.has(`${code}-${districtNumber}`);
}

export interface RuleAnswer {
  en: string;
  vi: string;
  /** Oral grading alternatives (any-of; each inner array = parts that are all required). */
  oral: string[][];
}

function placeName(code: StateCode, lang: 'en' | 'vi'): string {
  if (code === 'DC') return 'D.C.';
  const s = STATES_BY_CODE[code];
  return lang === 'en' ? s.nameEn : s.nameVi;
}

export function locationRuleAnswer(
  questionId: number,
  code: StateCode,
  districtNumber: number | null = null
): RuleAnswer | null {
  if (questionId === 29 && isVacantHouseSeat(code, districtNumber)) {
    return {
      en: 'The seat is vacant (no representative right now)',
      vi: 'Ghế này đang trống (hiện chưa có dân biểu)',
      oral: [['vacant'], ['no representative'], ['not representative'], ['empty']],
    };
  }
  if (!NON_STATE_CODES.has(code)) return null;
  if (questionId === 23) {
    return {
      en: `${placeName(code, 'en')} has no U.S. senators`,
      vi: `${placeName(code, 'vi')} không có thượng nghị sĩ Hoa Kỳ`,
      oral: [['no senator'], ['not senator']],
    };
  }
  if (code !== 'DC') return null;
  if (questionId === 61) {
    return { en: 'D.C. does not have a governor', vi: 'D.C. không có thống đốc', oral: [['no governor'], ['not governor']] };
  }
  if (questionId === 62) {
    return {
      en: 'D.C. is not a state and does not have a capital',
      vi: 'D.C. không phải tiểu bang nên không có thủ phủ',
      oral: [['not state'], ['no capital'], ['not capital']],
    };
  }
  return null;
}
