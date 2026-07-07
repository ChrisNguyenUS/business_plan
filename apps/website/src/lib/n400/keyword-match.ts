// Finds occurrences of What Mean vocabulary terms inside a question text so
// the UI can underline them and link to their definitions. Heuristic, not
// NLP: each term word may carry a simple English suffix (claimed ← claim,
// voted ← vote), longest term wins on overlap, matches never overlap.

export interface KeywordSpan {
  start: number;
  end: number; // exclusive
  termId: string; // WhatMeanQuestion id, e.g. 'wm-1'
}

export interface KeywordTerm {
  id: string;
  termEn: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "Claim to be a U.S. citizen" → /\bclaim(?:ed|d|es|s|ing)?\s+to\s+be\s+a\s+u\.s\.\s+citizen(?:…)?/gi
function termToRegex(termEn: string): RegExp {
  const words = termEn
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${escapeRegExp(w)}(?:ed|d|es|s|ing)?`);
  return new RegExp(`\\b${words.join('\\s+')}`, 'gi');
}

export function findKeywordSpans(text: string, terms: readonly KeywordTerm[]): KeywordSpan[] {
  // Longest term first so "register to vote" claims its range before "vote".
  const ordered = [...terms].sort((a, b) => b.termEn.length - a.termEn.length);
  const spans: KeywordSpan[] = [];

  const overlaps = (start: number, end: number) =>
    spans.some((s) => start < s.end && end > s.start);

  for (const term of ordered) {
    const re = termToRegex(term.termEn);
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0; // matchAll always sets index; TS types it optional
      const end = start + m[0].length;
      if (!overlaps(start, end)) spans.push({ start, end, termId: term.id });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}
