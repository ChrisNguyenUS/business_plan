// URL slug for each state/territory on the public N400 Ready pages
// (/[locale]/n400ready/states/<slug>). One slug for both languages.
import { STATES, STATES_BY_CODE, type StateCode } from '../state-data';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function stateSlug(code: StateCode): string {
  return toSlug(STATES_BY_CODE[code].nameEn);
}

const CODE_BY_SLUG = new Map<string, StateCode>(STATES.map((s) => [toSlug(s.nameEn), s.code]));

export const ALL_STATE_SLUGS: readonly string[] = STATES.map((s) => toSlug(s.nameEn));

export function stateFromSlug(slug: string): StateCode | null {
  return CODE_BY_SLUG.get(slug) ?? null;
}
