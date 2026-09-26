// Writes the Gate S1 review doc (speaking spec §12): every What-mean term with
// how it is graded, its synonyms and a natural sample answer; the cross-term
// allowlists; the Yes/No phrase table.
// Run from apps/website: npx tsx scripts/n400/speaking-grading-gate-report.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WHATMEAN_QUESTIONS } from '../../src/lib/n400/whatmean-data';
import { getWhatMeanOralConfig, gradeWhatMean } from '../../src/lib/n400/oral/get-whatmean-config';
import { classifyYesNo } from '../../src/lib/n400/oral/yes-no-intent';
import type { OralAnswerConfig } from '../../src/lib/n400/oral/types';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../../../docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md');

// One natural learner answer per term (not the taught wording).
const SAMPLES: Record<string, string> = {
  'wm-1': 'Saying that I am an American citizen', 'wm-2': 'Sign up to vote', 'wm-3': 'Choose a leader',
  'wm-4': 'I did not pay my taxes on time', 'wm-5': 'A person who does not live in America',
  'wm-6': 'A person who is not a citizen', 'wm-7': 'Remove the government with force',
  'wm-8': 'Ways that are against the Constitution', 'wm-9': 'A gun', 'wm-10': 'Hurt someone very badly',
  'wm-11': 'Killing people because of their race', 'wm-12': 'To make someone die',
  'wm-13': 'A place where police keep people', 'wm-14': 'A place where people must stay',
  'wm-15': 'A place where people are forced to work', 'wm-16': 'Breaking the law', 'wm-17': 'A small crime',
  'wm-18': 'The police caught you', 'wm-19': 'The police gave you a ticket', 'wm-20': 'Put in jail by the police',
  'wm-21': 'Having sex for money', 'wm-22': 'Bring things into the country illegally', 'wm-23': 'Illegal drugs',
  'wm-24': 'Tools to use illegal drugs', 'wm-25': 'Get a green card', 'wm-26': 'Playing games for money against the law',
  'wm-27': 'Pay child support', 'wm-28': 'Give money to your ex-wife after divorce', 'wm-29': 'Lying about who you are',
  'wm-30': 'Money from the government', 'wm-31': 'Claiming something that is not true', 'wm-32': 'Not telling the truth',
  'wm-33': 'Sent back to your country', 'wm-34': 'The supreme law of the land', 'wm-35': 'A republic',
  'wm-36': 'A promise to be loyal to America', 'wm-37': 'Use a gun to defend the country in a war',
  'wm-38': 'Work in the army but not fighting', 'wm-39': 'Cooking', 'wm-40': 'A person who is not in the military',
  'wm-41': 'Non-military work in a national crisis', 'wm-42': 'Helping the Red Cross',
  'wm-43': 'Someone who drinks too much alcohol', 'wm-44': 'Married to more than one person', 'wm-45': 'Single or married',
  'wm-46': 'My wife', 'wm-47': 'The marriage was canceled', 'wm-48': 'Lying under oath', 'wm-49': 'Promise to tell the truth',
  'wm-50': 'Prove that something is true', 'wm-51': 'Not decided yet', 'wm-52': 'You do not need to do something',
  'wm-53': 'An army that is not from the government', 'wm-54': 'A group that fights the government with weapons',
  'wm-55': 'People acting like police but not real police', 'wm-56': 'A punishment instead of jail',
  'wm-57': 'A program to help someone stop using drugs', 'wm-58': 'Being a good person who follows the law',
  'wm-59': 'Becoming a U.S. citizen', 'wm-60': 'Before', 'wm-61': 'Right now', 'wm-62': 'To tell',
};

const YES_NO = [
  'No', 'No, officer', 'Nope', 'Never', 'I have never been', "No, I haven't", 'Of course not', 'Absolutely not',
  "I don't think so", 'Yes', 'Yeah I have', 'Of course', 'Sure', "I don't know", 'Not sure', 'No idea', 'Say again',
  "I don't understand", "I didn't hear you", "I don't recall", "I'm not certain", 'Yes no', 'Maybe',
];

// Natural answers the current table does NOT accept (final review probes), with a
// suggested data change for the owner to accept or reject (D10).
const VARIANTS: [id: string, said: string, suggestion: string][] = [
  ['wm-3', 'Choose a leader', 'add synonym "choose leader", or keep near ("in an election" is taught)'],
  ['wm-6', 'A non-citizen', 'add synonyms "non citizen", "noncitizen"'],
  ['wm-6', 'A foreigner', 'add synonym "foreigner"'],
  ['wm-7', 'Remove the government using violence', 'add synonym "remove government violence"'],
  ['wm-12', 'To murder someone', 'add synonym "murder"'],
  ['wm-29', 'Not telling the truth', 'add synonym "not tell truth" (also #32 Lie\'s synonym)'],
  ['wm-44', 'Having two wives', 'add synonyms "2 wife", "2 husband"'],
  ['wm-45', 'Whether you are married', 'add synonym "married not" ("married or not"), or keep'],
  ['wm-47', 'The marriage was cancelled', 'add synonym "marriage cancelled" (double l does not stem to "cancel")'],
  ['wm-52', "You don't have to do it", 'keep near: the definition is mostly stopwords ("not have to do something")'],
  ['wm-52', "It's not something I know", 'block "know" (mustExclude) so this is not correct'],
  ['wm-61', 'Now', 'keep near, or add synonym "now"'],
];

const cell = (s: string) => s.replace(/\|/g, '/');
function describeConfig(c: OralAnswerConfig): string {
  const alts = c.alternatives.map((parts) => `[${parts.join(' + ')}]`).join(' OR ');
  const parts = [c.type === 'phrase' ? `≥${c.minKeywords} words of ${alts}` : alts];
  if (c.mustInclude) parts.push(`must say: ${c.mustInclude.join(', ')}`);
  if (c.mustExclude) parts.push(`blocked by: ${c.mustExclude.join(', ')}`);
  return parts.join('; ');
}

const rows = WHATMEAN_QUESTIONS.map((q) => {
  const c = getWhatMeanOralConfig(q.id)!;
  const synonyms = c.aliases ? c.aliases.alternatives.map((a) => a.join(' ')).join(' · ') : '';
  const sample = SAMPLES[q.id];
  const v = gradeWhatMean(sample, q.id)!.verdict;
  return `| ${q.num} | ${cell(q.termEn)} | ${cell(q.definitionEn)} | ${cell(describeConfig(c.primary))} | ${cell(synonyms)} | "${cell(sample)}" → **${v}** |`;
});

const counts = WHATMEAN_QUESTIONS.reduce<Record<string, number>>((acc, q) => {
  const v = gradeWhatMean(SAMPLES[q.id], q.id)!.verdict;
  acc[v] = (acc[v] ?? 0) + 1;
  return acc;
}, {});

const body = `# N400 Speaking Oral Answers — Gate S1 (grading review)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §3 · **Generated by:** apps/website/scripts/n400/speaking-grading-gate-report.ts

How to read it: "Graded as" lists the words that must be said. \`[a b c]\` means every listed word, in any order; \`OR\` separates accepted answers; "≥N words of" is the lenient rule for long definitions. Synonyms are extra accepted phrasings (every word required). The sample is a natural learner answer, not the taught wording.

## What-mean (62 terms)

Natural sample answers: ${counts.correct ?? 0} correct · ${counts.near ?? 0} near · ${counts.wrong ?? 0} wrong.

| # | Term | Taught definition | Graded as | Synonyms | Sample → verdict |
|---|---|---|---|---|---|
${rows.join('\n')}

## Natural answers that do NOT pass yet (decide each)

| # | Term | Said | Verdict | Suggested change |
|---|---|---|---|---|
${VARIANTS.map(([id, said, suggestion]) => {
  const q = WHATMEAN_QUESTIONS.find((x) => x.id === id)!;
  return `| ${q.num} | ${cell(q.termEn)} | "${cell(said)}" | **${gradeWhatMean(said, id)!.verdict}** | ${cell(suggestion)} |`;
}).join('\n')}

## Cross-term matches (pinned in whatmean-oral.corpus.test.ts)

A long answer that contains another term's short answer:
- #37's definition ("use a gun to defend…") is correct for #9 Weapon (gun).
- #48's definition ("to lie under oath") is correct for #29 Misrepresentation (lie).
- #49's definition ("promise to tell the truth") is correct for #62 Disclose (tell).
- Synonyms: "tell … citizen" (#1) and "not tell … truth" (#32) → #62; "more than one wife/husband" (#44) → #46; "lying under oath" (#48) → #29.

## Yes/No (all 37 standard answers are "No")

| Said | Heard as |
|---|---|
${YES_NO.map((s) => `| ${cell(s)} | **${classifyYesNo(s)}** |`).join('\n')}

"unclear" is never graded: the app asks "Bạn trả lời Yes hay No? Hãy nói lại." In a mock it does not use up the retry.

## Decisions (owner)

- Synonyms and overrides OK? <yes / changes>
- "Natural answers that do NOT pass yet": accept which suggested changes? <list>
- #3 Vote: "Choose a leader" is **near** because the taught definition says "in an election". Accept, or add "choose a leader" as a synonym? <keep near / add>
- Cross-term matches OK? <yes / tighten>
- Gate S1 pass? <yes / no>
`;

writeFileSync(out, body);
console.log(`wrote ${out}`);
