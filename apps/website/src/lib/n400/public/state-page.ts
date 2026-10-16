// Plain data for one public state page (spec §8). Answers come from the same
// functions the app teaches with (correctAnswersFor + location rules).
import type { Locale } from '@/lib/i18n/config';
import { correctAnswersFor } from '../quiz-engine';
import { NON_STATE_CODES } from '../location-rules';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { REPS_BY_STATE } from '../reps-data';
import { STATES_BY_CODE, type StateCode } from '../state-data';
import { PUBLIC_COPY } from './copy';
import { stateSlug } from './state-slugs';

export interface PublicAnswer {
  questionId: 23 | 29 | 61 | 62;
  question: string;
  questionAlt: string;
  answers: string[];
  note: string | null;
  star: boolean;
}
export interface DistrictRow { label: string; name: string }
export interface StatePageData {
  code: StateCode;
  slug: string;
  name: string;
  answers: PublicAnswer[];
  districts: DistrictRow[];
  related: { slug: string; name: string }[];
}

/** Location-based questions that are in the 2025 65/20 set (blog #2 ★ list). */
export const SIXTY_FIVE_TWENTY_LOCATION_IDS: ReadonlySet<number> = new Set([61]);

// States with the largest Vietnamese-American communities, used for "Other states".
const RELATED_ORDER: StateCode[] = ['CA', 'TX', 'WA', 'FL', 'VA', 'GA', 'MA', 'PA'];

const IDS = [23, 29, 61, 62] as const;

export function buildStatePage(code: StateCode, locale: Locale): StatePageData {
  const info = STATES_BY_CODE[code];
  const copy = PUBLIC_COPY[locale].state;
  const isState = !NON_STATE_CODES.has(code);
  const name = locale === 'vi' ? info.nameVi : info.nameEn;
  const reps = [...(REPS_BY_STATE.get(code) ?? [])].sort((a, b) => a.districtNumber - b.districtNumber);

  const answers: PublicAnswer[] = IDS.map((id) => {
    const q = N400_QUESTIONS_BY_ID.get(id)!;
    const question = locale === 'vi' ? q.questionVi : q.questionEn;
    const questionAlt = locale === 'vi' ? q.questionEn : q.questionVi;
    const star = SIXTY_FIVE_TWENTY_LOCATION_IDS.has(id);
    if (id === 29 && isState) {
      return { questionId: id, question, questionAlt, answers: [], note: copy.q29StateAnswer, star };
    }
    const taught = correctAnswersFor(q, code, id === 29 ? 0 : null).map((a) => a[locale]);
    const note = id === 29 && code !== 'DC' ? copy.q29TerritoryNote : null;
    return { questionId: id, question, questionAlt, answers: taught, note, star };
  });

  const districts: DistrictRow[] = isState
    ? reps.map((r) => ({ label: r.districtNumber === 0 ? 'At-Large' : String(r.districtNumber), name: r.name }))
    : [];

  const related = RELATED_ORDER.filter((c) => c !== code)
    .slice(0, 6)
    .map((c) => ({ slug: stateSlug(c), name: locale === 'vi' ? STATES_BY_CODE[c].nameVi : STATES_BY_CODE[c].nameEn }));

  return { code, slug: stateSlug(code), name, answers, districts, related };
}
