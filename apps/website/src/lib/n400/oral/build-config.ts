// Derives an OralAnswerConfig for every non-location Civics question from the
// answer the app teaches. Output is committed as oral-answer-config.generated.ts
// and reviewed as one diff. Changing a rule or override here is a spec change (D10).

import { N400_QUESTIONS, type N400Question } from '../questions-data';
import { keywordsOf, NEGATIONS, stem } from './normalize';
import type { OralAnswerConfig, OralAnswerType } from './types';

export const PERSON_NAME_IDS: ReadonlySet<number> = new Set([30, 38, 39, 57, 78, 83, 99, 105]);

// Full replacements. Each carries its reason; spec §3.1 "Initial overrides".
const REPLACE: Readonly<Record<number, OralAnswerConfig>> = {
  // Q37 — the generator keeps "becoming"; the idea an officer checks is keep + powerful.
  37: { type: 'single', alternatives: [['keep powerful']] },
  // Q120 — taught answer is "near New York city"; "New York" is the expected answer.
  120: { type: 'single', alternatives: [['new york']] },
  // Q35 — echo left only `people`, so any answer containing "people" passed (Gate 1, rev 3.2).
  35: { type: 'single', alternatives: [['more people']] },
};

// Q42–46 — "The Vice President" contains "president" and must not pass; neither
// may listing all three branches (Gate 1, rev 3.2).
const PRESIDENT_ONLY: Partial<OralAnswerConfig> = { mustExclude: ['vice', 'congress', 'courts'] };
// Q2, Q82 — "Father of the Constitution" must not pass (Gate 1, rev 3.2).
const NOT_FATHER: Partial<OralAnswerConfig> = { mustExclude: ['father'] };
const EXTEND: Readonly<Record<number, Partial<OralAnswerConfig>>> = {
  2: NOT_FATHER, 82: NOT_FATHER,
  // Q18 — listing all three branches must not pass (Gate 1, rev 3.2).
  18: { mustExclude: ['president', 'courts'] },
  42: PRESIDENT_ONLY, 43: PRESIDENT_ONLY, 44: PRESIDENT_ONLY, 45: PRESIDENT_ONLY, 46: PRESIDENT_ONLY,
  // Q102 — "before world war one" must not pass (Gate 1, rev 3.2).
  102: { mustInclude: ['after', '1'] },
};

const COUNT_WORDS: Readonly<Record<string, number>> = { two: 2, three: 3, four: 4, five: 5 };
const COUNT_RE = /\b(?:name|what are)(?: the)? (two|three|four|five)\b/;
const NAME_SUFFIX_RE = /\b(?:jr|sr|ii|iii|iv)\b\.?/gi;

const isDigits = (w: string) => /^\d+$/.test(w);
const UNIT_WORDS: ReadonlySet<string> = new Set(['year', 'years']);

// "Six (6) years" → `6`: an officer accepts the bare number (spec §3.1, rev 3.2).
const dropUnits = (kws: string[]): string[] =>
  kws.filter((k, i) => !(UNIT_WORDS.has(k) && i > 0 && isDigits(kws[i - 1])));

export function surnameOf(name: string): string {
  const kws = keywordsOf(name.replace(NAME_SUFFIX_RE, ' '));
  return kws[kws.length - 1] ?? '';
}

interface Built {
  config: OralAnswerConfig;
  echoFallback: boolean;
}

function build(q: N400Question): Built {
  const replaced = REPLACE[q.id];
  if (replaced) return { config: replaced, echoFallback: false };

  if (PERSON_NAME_IDS.has(q.id)) {
    return {
      config: { type: 'single', alternatives: q.answersEn.map((a) => [surnameOf(a)]) },
      echoFallback: false,
    };
  }

  const questionStems = new Set(keywordsOf(q.questionEn).map(stem));
  let echoFallback = false;
  const dropEcho = (kws: string[]): string[] => {
    const kept = kws.filter((k) => NEGATIONS.has(k) || !questionStems.has(stem(k)));
    if (kept.length === 0) {
      echoFallback = true;
      return kws;
    }
    return kept;
  };

  const countMatch = q.questionEn.toLowerCase().match(COUNT_RE);
  const expectedParts = countMatch ? COUNT_WORDS[countMatch[1]] : 0;

  const alternatives: string[][] = [];
  let type: OralAnswerType = 'single';
  let minKeywords: number | undefined;
  let mustInclude: string[] | undefined;

  for (const raw of q.answersEn) {
    const answer = raw.replace(/\([^)]*\)/g, ' ');
    const parts = answer.split(/,|\band\b/i).map((p) => p.trim()).filter(Boolean);
    if (expectedParts > 0 && parts.length === expectedParts) {
      type = 'enumeration';
      alternatives.push(parts.map((p) => dropUnits(dropEcho(keywordsOf(p))).join(' ')));
      continue;
    }
    const kws = dropUnits(dropEcho(keywordsOf(answer)));
    alternatives.push([kws.join(' ')]);
    if (kws.length >= 4) {
      type = 'phrase';
      minKeywords = Math.ceil((2 * kws.length) / 3);
      const required = kws.filter((k) => NEGATIONS.has(k) || isDigits(k));
      if (required.length > 0) mustInclude = required;
    }
  }

  const config: OralAnswerConfig = { type, alternatives };
  if (type === 'phrase' && minKeywords !== undefined) config.minKeywords = minKeywords;
  if (mustInclude) config.mustInclude = mustInclude;
  const extra = EXTEND[q.id];
  return { config: extra ? { ...config, ...extra } : config, echoFallback };
}

export function buildOralConfig(q: N400Question): OralAnswerConfig | null {
  if (q.isLocationBased) return null;
  return build(q).config;
}

export function buildAllOralConfigs(): Record<number, OralAnswerConfig> {
  const out: Record<number, OralAnswerConfig> = {};
  for (const q of N400_QUESTIONS) {
    const c = buildOralConfig(q);
    if (c) out[q.id] = c;
  }
  return out;
}

export function echoExceptionIds(): number[] {
  return N400_QUESTIONS.filter((q) => !q.isLocationBased && build(q).echoFallback).map((q) => q.id);
}
