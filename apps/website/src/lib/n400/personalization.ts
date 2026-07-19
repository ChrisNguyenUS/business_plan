// Turns a resolved (stateCode, districtNumber) pair into the localized civics
// facts shown on the onboarding "Personalization Summary" card.
//
// Everything here is local data — state-data.ts and reps-data.ts already ship
// the governor / capital / senators / representative that the USCIS civics test
// asks about. No network call is involved; the only remote step is the geocode
// that produced districtNumber in the first place.

import { STATES_BY_CODE, type StateCode, type StateInfo } from './state-data';
import { repForDistrict } from './reps-data';
import type { N400Lang } from './i18n/config';

export interface CivicsPersonalization {
  stateCode: StateCode;
  stateName: string;
  governor: string;
  capital: string | null;
  senators: string[];
  /** null when the district was ambiguous, or the state has no voting rep. */
  representative: string | null;
  /** 0 means an at-large district — never render it as "District 0". */
  districtNumber: number | null;
}

export function buildCivicsPersonalization(
  stateCode: string,
  districtNumber: number | null,
  lang: N400Lang
): CivicsPersonalization | null {
  const info = STATES_BY_CODE[stateCode.trim().toUpperCase() as StateCode] as
    | StateInfo
    | undefined;
  if (!info) return null;

  const rep = repForDistrict(info.code, districtNumber);

  return {
    stateCode: info.code,
    stateName: lang === 'vi' ? info.nameVi : info.nameEn,
    governor: info.governor,
    capital: info.capital,
    senators: info.senators,
    representative: rep?.name ?? null,
    districtNumber,
  };
}

/** "District 29" / "At-Large" / null. `prefix` comes from the dictionary. */
export function districtLabel(districtNumber: number | null, prefix: string): string | null {
  if (districtNumber === null) return null;
  return districtNumber === 0 ? 'At-Large' : `${prefix} ${districtNumber}`;
}
