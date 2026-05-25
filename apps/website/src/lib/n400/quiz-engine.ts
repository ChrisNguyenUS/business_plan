import { N400_QUESTIONS, N400_QUESTIONS_BY_ID, type N400Question } from './questions-data';
import { STATES_BY_CODE, type StateCode } from './state-data';

// ── Audio paths (served from public/n400-audio/* via symlink to N400_voice) ──

export function questionAudioUrl(id: number): string {
  return `/n400-audio/question/q${String(id).padStart(3, '0')}.mp3`;
}

export function answerAudioUrl(id: number): string | null {
  // 79 of 128 questions have a canonical answer audio (a001..a128 only some).
  // The frontend tries the URL; missing files fall back gracefully.
  return `/n400-audio/answer/a${String(id).padStart(3, '0')}.mp3`;
}

export function senatorAudioUrl(stateCode: StateCode, senator: string): string | null {
  const info = STATES_BY_CODE[stateCode];
  if (!info) return null;
  const file = senator.replace(/\s+/g, '_') + '.mp3';
  return `/n400-audio/State/${encodeURIComponent(info.nameEn)}/Senator%20voice/${encodeURIComponent(file)}`;
}

export function governorAudioUrl(stateCode: StateCode): string | null {
  const info = STATES_BY_CODE[stateCode];
  if (!info) return null;
  const file = info.governor.replace(/\s+/g, '_') + '.mp3';
  return `/n400-audio/State/${encodeURIComponent(info.nameEn)}/Governor/${encodeURIComponent(file)}`;
}

export function capitalAudioUrl(stateCode: StateCode): string | null {
  const info = STATES_BY_CODE[stateCode];
  if (!info || !info.capital) return null;
  return `/n400-audio/State/${encodeURIComponent(info.nameEn)}/Capital/capital-${stateCode}.mp3`;
}

// ── Per-user correct answers for location-based questions ────────────────────

export function correctAnswersFor(question: N400Question, stateCode: StateCode): { en: string; vi: string }[] {
  if (!question.isLocationBased) {
    return question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }));
  }
  const info = STATES_BY_CODE[stateCode];
  if (!info) return [];

  // Q23: senators
  if (question.id === 23) {
    return info.senators.map((s) => ({ en: s, vi: s }));
  }
  // Q29: representative — not resolvable without district lookup; skip in v1.
  if (question.id === 29) {
    // For practice, we surface all reps for the state as correct (any one accepted).
    // No per-user district yet; this is good-enough for self-study.
    return [];
  }
  // Q61: governor
  if (question.id === 61) {
    return [{ en: info.governor, vi: info.governor }];
  }
  // Q62: capital
  if (question.id === 62 && info.capital) {
    return [{ en: info.capital, vi: info.capital }];
  }
  return [];
}

// ── Distractor sampling (deterministic enough; pure) ─────────────────────────

function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], seed: string | number): T[] {
  const rng = mulberry32(hashSeed(seed));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface QuizOption {
  id: 'A' | 'B' | 'C' | 'D';
  en: string;
  vi: string;
  isCorrect: boolean;
}

const OPTION_IDS: QuizOption['id'][] = ['A', 'B', 'C', 'D'];

/**
 * Build 4 MCQ options for a question:
 *   1 randomly-picked correct answer + 3 distractors drawn from OTHER questions in the same category.
 * Deterministic given (questionId, seed). Filters out distractors that are textually similar to any
 * correct answer (case-insensitive substring match either way).
 */
export function buildOptions(
  question: N400Question,
  stateCode: StateCode,
  seed: string | number
): QuizOption[] {
  const correctList = correctAnswersFor(question, stateCode);
  // Fall back to question.answersEn if location-based has no resolution (e.g. Q29 in v1).
  const fallback = correctList.length === 0
    ? question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }))
    : correctList;

  const rng = mulberry32(hashSeed(`${question.id}-${seed}`));
  const correct = fallback[Math.floor(rng() * fallback.length)] ?? { en: '—', vi: '—' };

  const correctSet = new Set(fallback.map((c) => c.en.toLowerCase().trim()));
  const candidates: { en: string; vi: string }[] = [];

  for (const q of N400_QUESTIONS) {
    if (q.id === question.id) continue;
    if (q.category !== question.category) continue;
    for (let i = 0; i < q.answersEn.length; i++) {
      const en = q.answersEn[i];
      const vi = q.answersVi[i] ?? en;
      const enLower = en.toLowerCase().trim();
      if (correctSet.has(enLower)) continue;
      // Filter clear semantic overlap.
      let overlap = false;
      for (const c of correctSet) {
        if (c.length > 4 && enLower.includes(c)) { overlap = true; break; }
        if (enLower.length > 4 && c.includes(enLower)) { overlap = true; break; }
      }
      if (overlap) continue;
      candidates.push({ en, vi });
    }
  }

  if (candidates.length < 3) {
    // Widen pool to other categories if the same-category pool is too small.
    for (const q of N400_QUESTIONS) {
      if (q.id === question.id) continue;
      for (let i = 0; i < q.answersEn.length; i++) {
        const en = q.answersEn[i];
        const vi = q.answersVi[i] ?? en;
        if (correctSet.has(en.toLowerCase().trim())) continue;
        candidates.push({ en, vi });
      }
    }
  }

  // Dedupe by en text.
  const seen = new Set<string>();
  const unique: { en: string; vi: string }[] = [];
  for (const c of candidates) {
    const k = c.en.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }

  const shuffled = shuffle(unique, `${question.id}-d-${seed}`);
  const distractors = shuffled.slice(0, 3);

  const all = shuffle(
    [
      { ...correct, isCorrect: true },
      ...distractors.map((d) => ({ ...d, isCorrect: false })),
    ],
    `${question.id}-o-${seed}`
  );

  return all.map((opt, i) => ({
    id: OPTION_IDS[i],
    en: opt.en,
    vi: opt.vi,
    isCorrect: opt.isCorrect,
  }));
}

// ── Mock test selection ──────────────────────────────────────────────────────

export const MOCK_TEST_QUESTION_COUNT = 20;
export const MOCK_TEST_PASS_THRESHOLD = 12; // 12/20 USCIS rule

export function selectMockTestQuestions(seed: string | number): N400Question[] {
  // 20 random questions across all 128, no repeats.
  const ids = N400_QUESTIONS.map((q) => q.id);
  return shuffle(ids, `mock-${seed}`)
    .slice(0, MOCK_TEST_QUESTION_COUNT)
    .map((id) => N400_QUESTIONS_BY_ID.get(id)!)
    .filter(Boolean);
}

export function isPass(score: number): boolean {
  return score >= MOCK_TEST_PASS_THRESHOLD;
}
