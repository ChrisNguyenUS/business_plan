// USCIS writing (dictation) grading engine.
//
// Grades a typed sentence against the canonical USCIS answer using the rules an
// officer applies: punctuation and capitalization never fail, minor spelling is
// forgiven, but abbreviations are not accepted. Forgiven-but-imperfect words are
// returned as annotations so the UI can gently point them out without marking
// the answer wrong.
//
// USCIS rules encoded here:
//   - Punctuation / capitalization → never fail (capitalization is annotated).
//   - Minor spelling → passes when the character edit distance is within
//     threshold (1 for short words, 2 for words of >=8 chars); annotated.
//   - Abbreviations → fail (a token much shorter than the canonical word, or a
//     changed word count).

import { levenshtein } from 'edit-distance';
import type { N400Dict } from './i18n/vi';
import { tFormat } from './i18n/format';

export interface WordAnnotation {
  wordIndex: number;
  type: 'capitalization' | 'spelling';
  userWord: string;
  canonicalWord: string;
  hint: string;
}

export interface WordResult {
  userWord: string;
  canonicalWord: string;
  isCorrect: boolean;
  annotation: WordAnnotation | null;
}

export interface GradeResult {
  isCorrect: boolean;
  wordResults: WordResult[];
  annotations: WordAnnotation[];
  feedback: string;
}

// A token is forgiven as a spelling slip only if it is at least this fraction of
// the canonical word's length; shorter tokens read as abbreviations.
const ABBREVIATION_MIN_RATIO = 0.6;
// Words of this length or longer tolerate a slightly larger spelling distance.
const LONG_WORD_LEN = 8;

const insertCost = () => 1;
const removeCost = () => 1;
const updateCost = (a: string, b: string) => (a === b ? 0 : 1);

function charEditDistance(a: string, b: string): number {
  return levenshtein(a, b, insertCost, removeCost, updateCost).distance;
}

/**
 * Canonicalizes a sentence for comparison: trims, lowercases, strips
 * punctuation, and collapses runs of whitespace to a single space.
 */
export function normalizeForGrading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Splits into case-preserving, punctuation-free word tokens so word-level
// comparison can still see (and annotate) capitalization slips.
function tokenize(text: string): string[] {
  return text
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Compares a single typed word against the canonical word.
 *
 * Returns whether the word is acceptable and, when it is acceptable but not an
 * exact match, an annotation describing the slip. `wordIndex` is set to 0 here;
 * `gradeWritingSentence` rewrites it to the real position in the sentence.
 */
export function compareWords(
  userWord: string,
  canonicalWord: string,
  dict: N400Dict,
): { isCorrect: boolean; annotation: WordAnnotation | null } {
  // Exact match — nothing to flag.
  if (userWord === canonicalWord) {
    return { isCorrect: true, annotation: null };
  }

  const lowerUser = userWord.toLowerCase();
  const lowerCanonical = canonicalWord.toLowerCase();

  // Capitalization slip: only the casing differs. Never fails.
  if (lowerUser === lowerCanonical) {
    return {
      isCorrect: true,
      annotation: {
        wordIndex: 0,
        type: 'capitalization',
        userWord,
        canonicalWord,
        hint: tFormat(dict.writing.compareCapitalizationHint, { word: canonicalWord }),
      },
    };
  }

  // Abbreviation: far shorter than the canonical word. Fails.
  if (lowerUser.length < lowerCanonical.length * ABBREVIATION_MIN_RATIO) {
    return { isCorrect: false, annotation: null };
  }

  // Spelling slip: within the allowed edit distance for the word's length.
  const threshold = canonicalWord.length >= LONG_WORD_LEN ? 2 : 1;
  if (charEditDistance(lowerUser, lowerCanonical) <= threshold) {
    return {
      isCorrect: true,
      annotation: {
        wordIndex: 0,
        type: 'spelling',
        userWord,
        canonicalWord,
        hint: tFormat(dict.writing.compareSpellingHint, { word: canonicalWord }),
      },
    };
  }

  // Wrong word.
  return { isCorrect: false, annotation: null };
}

function buildFeedback(isCorrect: boolean, annotations: WordAnnotation[], dict: N400Dict): string {
  if (!isCorrect) {
    return dict.writing.feedbackWrong;
  }
  if (annotations.length === 0) {
    return dict.writing.feedbackPerfect;
  }
  const hasSpelling = annotations.some((a) => a.type === 'spelling');
  const hasCapitalization = annotations.some((a) => a.type === 'capitalization');
  if (hasSpelling && hasCapitalization) {
    return dict.writing.feedbackBoth;
  }
  if (hasSpelling) {
    return dict.writing.feedbackSpelling;
  }
  return dict.writing.feedbackCapitalization;
}

/**
 * Grades a full typed sentence against the canonical USCIS answer.
 *
 * A sentence passes when every canonical word is matched (exactly, or via an
 * allowed capitalization/spelling slip) and the typed answer has no extra or
 * missing words.
 */
export function gradeWritingSentence(userInput: string, canonical: string, dict: N400Dict): GradeResult {
  const userTokens = tokenize(userInput);
  const canonicalTokens = tokenize(canonical);
  const maxLen = Math.max(userTokens.length, canonicalTokens.length);

  const wordResults: WordResult[] = [];
  const annotations: WordAnnotation[] = [];
  let allCorrect = true;

  for (let i = 0; i < maxLen; i++) {
    const userWord = userTokens[i] ?? '';
    const canonicalWord = canonicalTokens[i] ?? '';

    // Extra typed word (no canonical counterpart) or missing word → fail.
    if (canonicalWord === '' || userWord === '') {
      wordResults.push({ userWord, canonicalWord, isCorrect: false, annotation: null });
      allCorrect = false;
      continue;
    }

    const { isCorrect, annotation } = compareWords(userWord, canonicalWord, dict);
    const positioned = annotation ? { ...annotation, wordIndex: i } : null;
    wordResults.push({ userWord, canonicalWord, isCorrect, annotation: positioned });
    if (positioned) annotations.push(positioned);
    if (!isCorrect) allCorrect = false;
  }

  return {
    isCorrect: allCorrect,
    wordResults,
    annotations,
    feedback: buildFeedback(allCorrect, annotations, dict),
  };
}
