// Derives an OralAnswerConfig for every What-mean term from the definition the
// app teaches. Output is committed as whatmean-oral-config.generated.ts and
// reviewed as one diff at Gate S1. Changing a rule, override or extension here
// is a spec change (speaking spec §3.1; Civics spec D10).

import { WHATMEAN_QUESTIONS, type WhatMeanQuestion } from '../whatmean-data';
import { keywordsOf, NEGATIONS } from './normalize';
import type { OralAnswerConfig } from './types';

// Full replacements, each with its reason (speaking spec §3.1, owner review at Gate S1).
const REPLACE: Readonly<Record<string, OralAnswerConfig>> = {
  // Nonresident — "someone" is filler; the idea is not living in the U.S.
  'wm-5': { type: 'single', alternatives: [['not live']] },
  // Alien — "someone" is filler; the idea is not being a U.S. citizen.
  'wm-6': { type: 'single', alternatives: [['not citizen']] },
  // Unconstitutional means — "methods … go" are filler.
  'wm-8': { type: 'single', alternatives: [['against constitution']] },
  // Weapon — an "or"-list: either item.
  'wm-9': { type: 'single', alternatives: [['knife'], ['gun']] },
  // Prostitution — "having" is filler.
  'wm-21': { type: 'single', alternatives: [['sex money']] },
  // Misrepresentation — the idea is lying; "lying" does not stem to "lie".
  'wm-29': { type: 'single', alternatives: [['lie'], ['lying']] },
  // Example of non-combatant services — examples: any one.
  'wm-39': { type: 'single', alternatives: [['nursing'], ['cooking'], ['translation']] },
  // Civilian — "anyone" is filler.
  'wm-40': { type: 'single', alternatives: [['not military'], ['not soldier']] },
  // Example of work of national importance — an example; the Red Cross is the idea.
  'wm-42': { type: 'single', alternatives: [['red cross']] },
  // Habitual drunkard — the idea, not the exact sentence ("person", "regularly" optional).
  'wm-43': { type: 'single', alternatives: [['drink much alcohol'], ['drink alcohol regularly'], ['alcoholic']] },
  // Marital status — naming two statuses explains it.
  'wm-45': { type: 'phrase', alternatives: [['single married divorced widowed']], minKeywords: 2 },
  // Spouse — an "or"-list: either item.
  'wm-46': { type: 'single', alternatives: [['husband'], ['wife']] },
  // Pending — "yet" is optional.
  'wm-51': { type: 'single', alternatives: [['not decided']] },
  // Naturalization — "process" is filler.
  'wm-59': { type: 'single', alternatives: [['become citizen']] },
};

// Additions to the generated config, each with its reason (prototype cross-term matrix).
const EXTEND: Readonly<Record<string, Partial<OralAnswerConfig>>> = {
  // Detention facility vs Labor camp: "forced to work" must not pass here.
  'wm-14': { mustInclude: ['stay'] },
  // Labor camp vs Detention facility: "forced to stay" must not pass here.
  'wm-15': { mustInclude: ['work'] },
  // Narcotics: Drug paraphernalia's definition ("equipment/tools to use illegal drugs") must not pass.
  'wm-23': { mustExclude: ['equipment', 'tools'] },
  // Bear arms: the non-combatant definition ("not fighting in a war") must not pass.
  'wm-37': { mustExclude: ['not'] },
  // Exempt: Fraudulent's definition ("claim something that is not true") must not pass.
  'wm-52': { mustExclude: ['true'] },
};

const isDigits = (w: string) => /^\d+$/.test(w);
// "Illegal drugs such as heroin or cocaine": the examples are not the definition.
const dropExamples = (text: string) => text.replace(/\bsuch as\b.*$/i, '');

export function buildWhatMeanOralConfig(q: WhatMeanQuestion): OralAnswerConfig {
  const replaced = REPLACE[q.id];
  if (replaced) return replaced;

  const alternatives: string[][] = [];
  let minKeywords = 0;
  const mustInclude: string[] = [];
  // "To tell / To provide information": a slash separates alternatives.
  for (const piece of q.definitionEn.split('/')) {
    const kws = keywordsOf(dropExamples(piece));
    if (kws.length === 0) continue;
    alternatives.push([kws.join(' ')]);
    if (kws.length >= 4) minKeywords = Math.max(minKeywords, Math.ceil((2 * kws.length) / 3));
    for (const k of kws) {
      if ((NEGATIONS.has(k) || isDigits(k)) && !mustInclude.includes(k)) mustInclude.push(k);
    }
  }

  const config: OralAnswerConfig = { type: minKeywords > 0 ? 'phrase' : 'single', alternatives };
  if (minKeywords > 0) config.minKeywords = minKeywords;
  if (mustInclude.length > 0) config.mustInclude = mustInclude;
  const extra = EXTEND[q.id];
  return extra ? { ...config, ...extra } : config;
}

export function buildAllWhatMeanOralConfigs(): Record<string, OralAnswerConfig> {
  const out: Record<string, OralAnswerConfig> = {};
  for (const q of WHATMEAN_QUESTIONS) out[q.id] = buildWhatMeanOralConfig(q);
  return out;
}
