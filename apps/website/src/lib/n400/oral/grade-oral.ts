// Deterministic oral-answer grader. Pure: runs identically in the browser
// (practice) and on the server (mock). Spec §3.2.

import { levenshtein } from 'edit-distance';
import { NEGATIONS, normalizeTokens, stem, transcriptStems } from './normalize';
import type { OralAnswerConfig, OralGrade, OralVerdict } from './types';

const LONG_WORD_LEN = 8;
const RANK: Record<OralVerdict, number> = { wrong: 0, near: 1, correct: 2 };

function editDistance(a: string, b: string): number {
  return levenshtein(a, b, () => 1, () => 1, (x, y) => (x === y ? 0 : 1)).distance;
}

// Negations are never answer words (Q60 needs "not" exactly), yet "not" is one edit
// from "vot" (vote: Gate 3, rev 3.15) and "never" from "ever" (Evers: rev 3.16).
// A near-match only ever contributes to `near` (D8): recognizers output real
// words, so "institution" for "constitution" is a different word, not a typo.
function isNearWord(token: string, keywordStem: string): boolean {
  if (NEGATIONS.has(token)) return false;
  if (/^\d+$/.test(token) || /^\d+$/.test(keywordStem)) return false;
  if (token.length < 3 || keywordStem.length < 3) return false;
  return editDistance(token, keywordStem) <= (keywordStem.length >= LONG_WORD_LEN ? 2 : 1);
}

function requiredCount(config: OralAnswerConfig, partSize: number): number {
  if (config.type === 'phrase') return config.minKeywords ?? partSize;
  if (config.type === 'enumeration') return partSize <= 3 ? partSize : Math.ceil((2 * partSize) / 3);
  return partSize;
}

function takeToken(tokens: readonly string[], used: Set<number>, test: (t: string) => boolean): boolean {
  const i = tokens.findIndex((t, ix) => !used.has(ix) && test(t));
  if (i < 0) return false;
  used.add(i);
  return true;
}

// The config's own keyword stems: a stall made only of these is part of the answer (speaking spec §3.4).
function keywordStems(config: OralAnswerConfig): Set<string> {
  const words = [...config.alternatives.flat().flatMap((part) => part.split(' ')), ...(config.mustInclude ?? [])];
  return new Set(words.filter(Boolean).map(stem));
}

export function gradeOralAnswer(transcript: string, config: OralAnswerConfig): OralGrade {
  const keep = keywordStems(config);
  const tokens = transcriptStems(transcript, { keep });
  const mustInclude = new Set((config.mustInclude ?? []).map(stem));
  const excluded = (config.mustExclude ?? []).some((w) => tokens.includes(stem(w)));

  // Speaking Gate S1: a phrase — a word sequence with its stopwords — is a full answer
  // ("You don't have to do it" → "not have to"). Stalls are dropped first, as for keywords.
  if (config.phrases?.length) {
    const said = ` ${normalizeTokens(transcript, { dropStalls: true, keep }).join(' ')} `;
    const hit = config.phrases.find((p) => said.includes(` ${p} `));
    if (hit) return { verdict: excluded ? 'near' : 'correct', matched: [hit], missing: [] };
  }

  let best: { rank: number; hits: number; grade: OralGrade } | null = null;

  for (const parts of config.alternatives) {
    const matched: string[] = [];
    const missing: string[] = [];
    let allExact = true;
    let allLoose = true;
    let total = 0;
    let hits = 0;
    let partsLoose = 0;

    for (const part of parts) {
      const keywords = part.split(' ').filter(Boolean);
      // One-to-one within a part; a fresh `used` per part allows reuse across parts.
      const used = new Set<number>();
      const exact = keywords.map((kw) => takeToken(tokens, used, (t) => t === stem(kw)));
      let exactCount = 0;
      let looseCount = 0;
      let mustOk = true;

      keywords.forEach((kw, j) => {
        const s = stem(kw);
        const ok = exact[j] || takeToken(tokens, used, (t) => isNearWord(t, s));
        if (exact[j]) exactCount++;
        if (ok) {
          looseCount++;
          matched.push(kw);
        } else {
          missing.push(kw);
        }
        if (mustInclude.has(s) && !exact[j]) mustOk = false;
      });

      const need = requiredCount(config, keywords.length);
      if (exactCount < need || !mustOk) allExact = false;
      if (looseCount < need) allLoose = false;
      else partsLoose++;
      total += keywords.length;
      hits += looseCount;
    }

    // Enumerations count named items; single/phrase count keywords (spec §3.2 rule 7, rev 3.2).
    const partial =
      config.type === 'enumeration' ? partsLoose > 0 && partsLoose * 2 >= parts.length : hits > 0 && hits * 2 >= total;
    const verdict: OralVerdict = allExact && !excluded ? 'correct' : allLoose || partial ? 'near' : 'wrong';
    const rank = RANK[verdict];
    if (!best || rank > best.rank || (rank === best.rank && hits > best.hits)) {
      best = { rank, hits, grade: { verdict, matched, missing } };
    }
  }

  return best?.grade ?? { verdict: 'wrong', matched: [], missing: [] };
}
