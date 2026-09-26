// Yes/No answers to the N-400 "Have you ever…" questions (speaking spec §3.2).
// Deliberately NOT built on transcriptStems: the generic stall list drops "yes",
// and single letters matter here ("I have not" vs "I have").

export type YesNoIntent = 'yes' | 'no' | 'unclear';

// Not knowing / asking again: never an answer, even though some contain "no" or "not".
const UNSURE: readonly string[] = [
  'i do not know', 'i dont know', 'do not know', 'dont know', 'i am not sure', 'not sure',
  'i do not remember', 'i dont remember', 'i can not remember', 'no idea', 'no clue', 'dunno',
  'i forgot', 'i forget', 'say again', 'say that again', 'say it again', 'repeat', 'pardon',
  'what was the question', 'what is the question', 'come again', 'one more time',
  // Not understanding / not hearing / not recalling (S1 final review): "I don't
  // understand" held a "not" and graded as a correct "No".
  'not understand', 'dont understand', 'didnt understand', 'not get it', 'dont get it',
  'not hear', 'didnt hear', 'cant hear', 'not catch', 'didnt catch',
  'not recall', 'dont recall', 'cant recall', 'not certain',
  'not really sure', 'not quite sure', 'not so sure',
];
const NO_WORDS: ReadonlySet<string> = new Set(['no', 'nope', 'nah', 'never', 'not']);
const YES_WORDS: ReadonlySet<string> = new Set(['yes', 'yeah', 'yep', 'yup', 'correct', 'sure']);
// "I have / I did / I do / I am / I was" — a yes unless a negation follows.
const YES_AFTER_I: ReadonlySet<string> = new Set(['have', 'did', 'do', 'am', 'was']);

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bcan't\b/g, 'can not')
    .replace(/n't\b/g, ' not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/'m\b/g, ' am')
    .replace(/'ve\b/g, ' have')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function classifyYesNo(transcript: string): YesNoIntent {
  const w = words(transcript);
  const joined = ` ${w.join(' ')} `;
  if (UNSURE.some((p) => joined.includes(` ${p} `))) return 'unclear';
  const no = w.some((x) => NO_WORDS.has(x));
  const yes = w.some(
    (x, i) =>
      YES_WORDS.has(x) ||
      (x === 'i' && YES_AFTER_I.has(w[i + 1] ?? '') && !NO_WORDS.has(w[i + 2] ?? '')) ||
      (x === 'of' && w[i + 1] === 'course' && !NO_WORDS.has(w[i + 2] ?? '')),
  );
  if (yes === no) return 'unclear';
  return no ? 'no' : 'yes';
}

export function gradeYesNo(transcript: string, expected: 'yes' | 'no'): 'correct' | 'wrong' | 'unclear' {
  const intent = classifyYesNo(transcript);
  if (intent === 'unclear') return 'unclear';
  return intent === expected ? 'correct' : 'wrong';
}
