// Speech-transcript normalizer shared by the oral-answer generator and grader.
// Spec §3.2 rule 1. Speech recognizers emit real words (never typos), so this
// module only canonicalizes form: case, punctuation, numbers, fillers.

const NUMBER_WORDS: ReadonlyMap<string, number> = new Map([
  ['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6],
  ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10], ['eleven', 11], ['twelve', 12],
  ['thirteen', 13], ['fourteen', 14], ['fifteen', 15], ['sixteen', 16], ['seventeen', 17],
  ['eighteen', 18], ['nineteen', 19], ['twenty', 20], ['thirty', 30], ['forty', 40],
  ['fifty', 50], ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90],
]);

const ORDINAL_WORDS: ReadonlyMap<string, number> = new Map([
  ['first', 1], ['second', 2], ['third', 3], ['fourth', 4], ['fifth', 5], ['sixth', 6],
  ['seventh', 7], ['eighth', 8], ['ninth', 9], ['tenth', 10], ['eleventh', 11], ['twelfth', 12],
  ['thirteenth', 13], ['fourteenth', 14], ['fifteenth', 15], ['sixteenth', 16],
  ['seventeenth', 17], ['eighteenth', 18], ['nineteenth', 19], ['twentieth', 20],
]);

export const NEGATIONS: ReadonlySet<string> = new Set(['not', 'no', 'never', 'without']);

const STOPWORDS: ReadonlySet<string> = new Set(
  (
    'the a an of to in on at for by from with into and or but is are was were be been being am ' +
    'it its they them their there this that these those who whom what which when where why how ' +
    'we you he she him her his hers us our ours my me um uh er ah hmm like so well think answer ' +
    'do does did has have had can could will would should shall may might must too very just ' +
    'also then than as if because during any day'
  ).split(' '),
);

const QUALIFIER_STEMS: ReadonlySet<string> = new Set(['america', 'american', 'usa', 'your']);

// Below 100: "twenty seven" → 27. A units word right before "hundred" is left
// for the next number ("one hundred one hundred" is 100, 100 — not 101, 100).
function readBelow100(raw: readonly string[], i: number): [number, number] | null {
  const n = NUMBER_WORDS.get(raw[i]);
  if (n === undefined) return null;
  const u = NUMBER_WORDS.get(raw[i + 1]);
  if (n >= 20 && u !== undefined && u >= 1 && u <= 9 && raw[i + 2] !== 'hundred') return [n + u, i + 2];
  return [n, i + 1];
}

// Composes one spoken number starting at raw[i]; returns [value, nextIndex].
// Neighbouring numbers are never summed ("four five" is 4, 5), and a teen
// followed by a two-digit pair is read as a year ("seventeen seventy six" → 1776).
function readNumber(raw: readonly string[], i: number): [number, number] | null {
  if (raw[i] === 'hundred') return [100, i + 1];
  const first = NUMBER_WORDS.get(raw[i]);
  if (first === undefined) return null;

  if (first >= 1 && first <= 9 && raw[i + 1] === 'hundred') {
    let j = i + 2;
    if (raw[j] === 'and' && NUMBER_WORDS.has(raw[j + 1])) j++;
    const rest = raw[j + 1] === 'hundred' ? null : readBelow100(raw, j);
    return rest ? [first * 100 + rest[0], rest[1]] : [first * 100, j === i + 2 ? j : j - 1];
  }

  const [v, j] = readBelow100(raw, i)!;
  if (v >= 11 && v <= 19 && raw[j + 1] !== 'hundred') {
    const pair = readBelow100(raw, j);
    if (pair && pair[0] >= 10) return [v * 100 + pair[0], pair[1]];
  }
  return [v, j];
}

export function normalizeTokens(text: string): string[] {
  let s = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bcan't\b/g, 'can not')
    .replace(/n't\b/g, ' not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/'s\b/g, '');
  // Before single letters are dropped: "World War I" must not collapse into "world war".
  s = s
    .replace(/\bworld war (?:ii|two|2)\b/g, 'world war 2')
    .replace(/\bworld war (?:i|one|1)\b/g, 'world war 1');
  s = s.replace(/[^a-z0-9\s]/g, ' ');

  const raw = s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^(\d+)(?:st|nd|rd|th)$/, '$1'));

  const out: string[] = [];
  for (let i = 0; i < raw.length; ) {
    const num = readNumber(raw, i);
    if (num) {
      out.push(String(num[0]));
      i = num[1];
      continue;
    }
    const t = raw[i++];
    const ord = ORDINAL_WORDS.get(t);
    if (ord !== undefined) {
      out.push(String(ord));
      continue;
    }
    if (t.length === 1 && !/\d/.test(t)) continue;
    out.push(t);
  }
  return out;
}

export function stem(word: string): string {
  if (/^\d+$/.test(word) || word.length <= 3) return word;
  let s = word;
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y';
  else if (s.endsWith('sses')) s = s.slice(0, -2);
  else if (/(?:ches|shes|xes|zes)$/.test(s)) s = s.slice(0, -2);
  else if (s.endsWith('ss') || s.endsWith('us') || s.endsWith('is')) {
    // congress, bus, this — not plurals
  } else if (s.endsWith('s')) s = s.slice(0, -1);
  if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2);
  if (s.endsWith('e') && s.length > 3) s = s.slice(0, -1);
  return s;
}

export function contentTokens(
  tokens: readonly string[],
  opts: { keepQualifiers?: boolean } = {},
): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (STOPWORDS.has(t)) continue;
    if (!opts.keepQualifiers) {
      if (t === 'united' && tokens[i + 1] === 'states') {
        i++;
        continue;
      }
      if (QUALIFIER_STEMS.has(stem(t))) continue;
    }
    out.push(t);
  }
  return out;
}

/** Answer-side keywords: qualifiers dropped unless nothing else is left; deduped by stem. */
export function keywordsOf(text: string): string[] {
  const tokens = normalizeTokens(text);
  let kws = contentTokens(tokens);
  if (kws.length === 0) kws = contentTokens(tokens, { keepQualifiers: true });
  const seen = new Set<string>();
  return kws.filter((w) => {
    const k = stem(w);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Transcript-side tokens: qualifiers kept (extra words are ignored anyway), stemmed. */
export function transcriptStems(text: string): string[] {
  return contentTokens(normalizeTokens(text), { keepQualifiers: true }).map(stem);
}
