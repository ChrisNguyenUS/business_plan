# N400 Speaking Oral Answers — Slice S1 (Grading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grade spoken What-mean definitions and Yes/No answers, and add one shared grader for Civics, What-mean and Yes/No items. No UI yet. The slice ends with the Gate S1 review doc for the owner.

**Architecture:**
- **Pure, deterministic modules** in `apps/website/src/lib/n400/oral/`:
  - a What-mean config generator, following the pattern of the Civics generator (`build-config.ts` → committed `*.generated.ts`, drift test);
  - owner-reviewed synonyms, graded as a separate all-keywords config, keeping the better verdict of the two;
  - a Yes/No intent classifier that deliberately does NOT use the generic stall list;
  - `gradeSpokenItem`, which dispatches by item kind.
- **One engine change:** a stall phrase is kept when every one of its words is a keyword of the item being graded.

**Tech Stack:** TypeScript, vitest (node, no DOM), `npx tsx` for generator scripts (tsx ^4.19.2 is a devDependency).

**Spec:** `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (rev 1.0, §3, §12 S1). Builds on `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16).

## Global Constraints

- **Scope:** `apps/website/` only (CLAUDE.md monorepo isolation). All commands run from `apps/website/`.
- **No UI, no DB, no flags, no migrations in S1** (spec §12).
- **Grading stays pure and deterministic.** It runs in the browser and on the server, with no network and no LLM (spec S1).
- **Grading rules are spec-governed** (Civics D10). Every override, EXTEND entry and synonym carries a one-line reason. The owner reviews them at Gate S1.
- **D8:** a near-match only ever gives `near`.
- **The generic `STALL_PHRASES` must never run inside the Yes/No classifier**, because it drops "yes" (spec §3.2).
- **These existing Civics tests stay green:** 124 generated configs; every taught answer correct; the question-echo exceptions Q6/Q76; the cross-question allowlist; the rev 3.16 stall sweep over every config; "stall removal never touches a taught answer".
- **Gate commands, run separately:** `npm run type-check`, `npm run test`, `npm run build`. `src/components/n400/mobile-layout.test.ts > progress tabs avoid fixed desktop columns on mobile` fails on `main` already: report it, don't fix it.
- **Commits:** one logical change each, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings carried from prototyping (2026-09-25, all 62 terms)

These were measured before the plan was written. Each refines the spec's wording, and each task updates the spec text it touches.

1. **§3.4, "every word", not "one word".** A stall is kept only when *every* one of its words (stopwords aside) is an item keyword. With "any word", "one more time" would be kept for Civics Q35 (`more people`) and would re-open the rev 3.16 fix.
2. **Synonyms are graded as their own `single` config** (every keyword required, inheriting the primary's `mustExclude`); the better verdict wins. A `phrase` config's `minKeywords` would make any shorter synonym unreachable: 13 of 25 drafted synonyms failed their own self-test when merged. So `getWhatMeanOralConfig` returns `{ primary, aliases }`, not one merged config.
3. **Generator rules:**
   - `/` splits alternatives;
   - examples after "such as" are dropped (#23 "Illegal drugs such as heroin or cocaine" → `illegal drugs`);
   - "or"-lists become alternatives through explicit `REPLACE` entries (#9, #39, #46), not automatically. Automatic "or" splitting breaks clause definitions such as #11 and #29.
4. **Measured with this plan's exact rules:**
   - 61/62 definitions grade correct against their own config; #61 needs Task 1;
   - no term echo grades correct;
   - cross-term correct pairs: exactly `wm-37→wm-9`, `wm-48→wm-29`, `wm-49→wm-62`;
   - synonym cross pairs: exactly 5 (Task 3);
   - 60 of 62 natural sample answers grade correct before Task 1 (#3 near, #61 wrong); 61 of 62 after (#3 "Choose a leader" stays `near`; the owner decides at the Gate).

## Review Focus

1. **A What-mean answer that drops the definition's negation** ("Someone who is a U.S. citizen" for #6 Alien, "Someone who lives in the U.S." for #5 Nonresident) must never grade correct. Pinned in Task 3.
2. **Stall protection must not re-open Civics false positives:** "one more time" stays dropped for Q35 because only one of its words is a keyword. Pinned in Task 1 (unit) and by the existing Civics stall sweep.
3. **A polite, framed answer** ("It means to remove a government by force, officer") must grade exactly like the bare definition. Pinned in Task 3.
4. **A location-based Civics question with no spoken answer** (Q23 or Q62 for a DC address) must report `canSpeak = false`, and `gradeSpokenItem` must return `wrong` for it rather than throw. Pinned in Task 5.
5. **Yes/No negatives phrased as affirmatives** ("Of course not", "Absolutely not", "No idea") must be `no`, `no` and `unclear` respectively. Pinned in Task 4's table.

---

### Task 1: Keep a stall that is the item's own answer (spec §3.4)

**Files:**
- Modify: `apps/website/src/lib/n400/oral/normalize.ts` (`normalizeTokens` options, the new `isAnswerStall`, `transcriptStems`)
- Modify: `apps/website/src/lib/n400/oral/grade-oral.ts` (`gradeOralAnswer` passes its keyword stems)
- Test: `apps/website/src/lib/n400/oral/normalize.test.ts`, `apps/website/src/lib/n400/oral/grade-oral.test.ts` (append)
- Modify: `docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md` (§3.4 and the S5 row)

**Interfaces:**
- Produces:
  - `normalizeTokens(text: string, opts?: { dropStalls?: boolean; keep?: ReadonlySet<string> }): string[]`
  - `transcriptStems(text: string, opts?: { keep?: ReadonlySet<string> }): string[]`
  - `gradeOralAnswer`'s signature is unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `normalize.test.ts`:

```ts
// Speaking spec §3.4: a stall is kept when every one of its words is a keyword
// of the item being graded (What-mean #61 "Current" is "Right now").
describe('transcriptStems — stall protection (speaking spec §3.4)', () => {
  it('keeps a stall whose every word is a keyword of the item', () => {
    expect(transcriptStems('right now', { keep: new Set(['right', 'now', 'live']) })).toEqual(['right', 'now']);
  });

  it('still drops it without that keyword set', () => {
    expect(transcriptStems('right now')).toEqual([]);
  });

  it('drops a stall that shares only one word with the item (Civics Q35 "more people")', () => {
    expect(transcriptStems('one more time', { keep: new Set(['more', 'peopl']) })).toEqual([]);
  });
});
```

Append to `grade-oral.test.ts`:

```ts
describe('gradeOralAnswer — a stall that is the answer is kept (speaking spec §3.4)', () => {
  const current: OralAnswerConfig = { type: 'single', alternatives: [['right now'], ['live now']] };

  it('"right now" is correct for What-mean #61 (Current)', () => {
    expect(gradeOralAnswer('right now', current).verdict).toBe('correct');
  });

  it('"where you live now" is correct too', () => {
    expect(gradeOralAnswer('where you live now', current).verdict).toBe('correct');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/normalize.test.ts src/lib/n400/oral/grade-oral.test.ts`
Expected: FAIL, 3 failures:
- the `keep` test gets `[]` (the option is ignored);
- `"right now"` gets `'wrong'`;
- `"where you live now"` gets `'near'`.

The other two new normalize tests pass (they pin existing behaviour).

- [ ] **Step 3: Implement**

In `normalize.ts`, directly after the `STALL_RE` constant, add:

```ts
// Speaking spec §3.4: a stall is kept when every one of its words (stopwords
// aside) is a keyword of the item being graded (What-mean #61 is "Right now").
// One shared word is not enough: "one more time" stays dropped for Civics Q35.
function isAnswerStall(phrase: string, keep: ReadonlySet<string> | undefined): boolean {
  if (!keep || keep.size === 0) return false;
  const words = phrase.split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return words.length > 0 && words.every((w) => keep.has(stem(w)));
}
```

Replace the signature line

```ts
export function normalizeTokens(text: string, opts: { dropStalls?: boolean } = {}): string[] {
```

with

```ts
export function normalizeTokens(
  text: string,
  opts: { dropStalls?: boolean; keep?: ReadonlySet<string> } = {},
): string[] {
```

Replace

```ts
  if (opts.dropStalls) s = s.replace(STALL_RE, ' ');
```

with

```ts
  if (opts.dropStalls) s = s.replace(STALL_RE, (m) => (isAnswerStall(m, opts.keep) ? m : ' '));
```

Replace `transcriptStems`:

```ts
/** Transcript-side tokens: stalls dropped (unless they are the item's own keywords, `keep`),
 *  qualifiers kept (extra words are ignored anyway), stemmed. */
export function transcriptStems(text: string, opts: { keep?: ReadonlySet<string> } = {}): string[] {
  return contentTokens(normalizeTokens(text, { dropStalls: true, keep: opts.keep }), { keepQualifiers: true }).map(stem);
}
```

In `grade-oral.ts`, add above `gradeOralAnswer`:

```ts
// The config's own keyword stems: a stall made only of these is part of the answer (speaking spec §3.4).
function keywordStems(config: OralAnswerConfig): Set<string> {
  const words = [...config.alternatives.flat().flatMap((part) => part.split(' ')), ...(config.mustInclude ?? [])];
  return new Set(words.filter(Boolean).map(stem));
}
```

and change the first line of `gradeOralAnswer` from `const tokens = transcriptStems(transcript);` to:

```ts
  const tokens = transcriptStems(transcript, { keep: keywordStems(config) });
```

- [ ] **Step 4: Run the oral suite**

Run: `npx vitest run src/lib/n400/oral`
Expected: PASS, every file. This includes the Civics rev 3.16 sweep in `grade-oral.corpus.test.ts` ("one more time", "now" and "right now" still wrong on every Civics config) and "stall removal never touches a taught answer".

- [ ] **Step 5: Spec §3.4 + S5 wording**

In the speaking spec, replace the §3.4 first bullet:

```markdown
- `transcriptStems(text, { keep })` does not drop a stall phrase when any of its word stems is in `keep`.
```

with:

```markdown
- `transcriptStems(text, { keep })` keeps a stall phrase only when **every** one of its words (stopwords aside) is in `keep`. One shared word is not enough: "one more time" stays dropped for Civics Q35 (`more people`), keeping the rev 3.16 fix (S1 prototyping).
```

In the §2 table row S5, replace `a stall phrase is never dropped when one of its words is a keyword of the item being graded.` with `a stall phrase is never dropped when every one of its words is a keyword of the item being graded.`

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/normalize.ts src/lib/n400/oral/grade-oral.ts src/lib/n400/oral/normalize.test.ts src/lib/n400/oral/grade-oral.test.ts ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "feat(n400app): keep a stall that is the item's own answer (speaking spec §3.4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: What-mean config generator + generated file (spec §3.1)

**Files:**
- Create: `apps/website/src/lib/n400/oral/build-whatmean-config.ts`
- Create: `apps/website/scripts/n400/build-whatmean-oral-config.ts`
- Create (generated): `apps/website/src/lib/n400/oral/whatmean-oral-config.generated.ts`
- Test: `apps/website/src/lib/n400/oral/build-whatmean-config.test.ts`
- Modify: spec §3.1 (generator rules)

**Interfaces:**
- Consumes: `WHATMEAN_QUESTIONS`, `WhatMeanQuestion` from `../whatmean-data`; `keywordsOf`, `NEGATIONS` from `./normalize`; `OralAnswerConfig` from `./types`.
- Produces:
  - `buildWhatMeanOralConfig(q: WhatMeanQuestion): OralAnswerConfig`
  - `buildAllWhatMeanOralConfigs(): Record<string, OralAnswerConfig>` (keyed by `"wm-<n>"`)
  - `WHATMEAN_ORAL_CONFIG: Record<string, OralAnswerConfig>` (generated)

- [ ] **Step 1: Write the failing test**

Create `build-whatmean-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { buildAllWhatMeanOralConfigs, buildWhatMeanOralConfig } from './build-whatmean-config';
import { WHATMEAN_ORAL_CONFIG } from './whatmean-oral-config.generated';

const cfg = (id: string) => buildWhatMeanOralConfig(WHATMEAN_QUESTIONS_BY_ID[id]);

describe('buildWhatMeanOralConfig — rules (speaking spec §3.1)', () => {
  it('up to 3 keywords: every keyword is required', () => {
    expect(cfg('wm-7')).toEqual({ type: 'single', alternatives: [['remove government force']] });
  });

  it('4+ keywords make a phrase needing ⌈2k/3⌉', () => {
    expect(cfg('wm-11')).toEqual({ type: 'phrase', alternatives: [['kill group people religion race']], minKeywords: 4 });
  });

  it('negations and digits are required exactly', () => {
    expect(cfg('wm-4')).toMatchObject({ mustInclude: ['not'] });
    expect(cfg('wm-44')).toMatchObject({ mustInclude: ['1'] });
  });

  it('a "/" separates alternatives', () => {
    expect(cfg('wm-62').alternatives).toEqual([['tell'], ['provide information']]);
  });

  it('examples after "such as" are not part of the definition', () => {
    expect(cfg('wm-23').alternatives).toEqual([['illegal drugs']]);
    expect(cfg('wm-30').alternatives).toEqual([['money government']]);
  });

  it('"or"-lists are explicit overrides: any one item', () => {
    expect(cfg('wm-9').alternatives).toEqual([['knife'], ['gun']]);
    expect(cfg('wm-39').alternatives).toEqual([['nursing'], ['cooking'], ['translation']]);
    expect(cfg('wm-46').alternatives).toEqual([['husband'], ['wife']]);
  });

  it('near-twins are kept apart (prototype cross-term matrix)', () => {
    expect(cfg('wm-14')).toMatchObject({ mustInclude: ['stay'] });
    expect(cfg('wm-15')).toMatchObject({ mustInclude: ['work'] });
    expect(cfg('wm-23')).toMatchObject({ mustExclude: ['equipment', 'tools'] });
    expect(cfg('wm-37')).toMatchObject({ mustExclude: ['not'] });
    expect(cfg('wm-52')).toMatchObject({ mustExclude: ['true'] });
  });
});

describe('generated file', () => {
  it('matches the generator exactly (re-run: npx tsx scripts/n400/build-whatmean-oral-config.ts)', () => {
    expect(WHATMEAN_ORAL_CONFIG).toEqual(buildAllWhatMeanOralConfigs());
  });

  it('covers all 62 terms', () => {
    expect(Object.keys(WHATMEAN_ORAL_CONFIG)).toHaveLength(62);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/build-whatmean-config.test.ts`
Expected: FAIL. It cannot resolve `./build-whatmean-config`.

- [ ] **Step 3: Write the generator**

Create `build-whatmean-config.ts`:

```ts
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
```

Create `scripts/n400/build-whatmean-oral-config.ts`:

```ts
// Regenerates src/lib/n400/oral/whatmean-oral-config.generated.ts.
// Run from apps/website: npx tsx scripts/n400/build-whatmean-oral-config.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAllWhatMeanOralConfigs } from '../../src/lib/n400/oral/build-whatmean-config';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../src/lib/n400/oral/whatmean-oral-config.generated.ts');

const body =
  '// AUTO-GENERATED by scripts/n400/build-whatmean-oral-config.ts — do not edit by hand.\n' +
  '// Regenerate: npx tsx scripts/n400/build-whatmean-oral-config.ts (from apps/website)\n' +
  '// Spec: docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §3.1\n\n' +
  "import type { OralAnswerConfig } from './types';\n\n" +
  `export const WHATMEAN_ORAL_CONFIG: Record<string, OralAnswerConfig> = ${JSON.stringify(buildAllWhatMeanOralConfigs(), null, 2)};\n`;

writeFileSync(out, body);
console.log(`wrote ${out}`);
```

- [ ] **Step 4: Generate the file**

Run: `npx tsx scripts/n400/build-whatmean-oral-config.ts`
Expected: `wrote …/whatmean-oral-config.generated.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/oral/build-whatmean-config.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Spec §3.1 generator rules**

In the speaking spec §3.1, replace the bullet

```markdown
  - an "or" list (`A knife or a gun`, `Husband or wife`, `Nursing, cooking, or translation`) becomes alternatives, any one of which is enough;
```

with

```markdown
  - a `/` separates alternatives ("To tell / To provide information"). Examples after "such as" are dropped (#23 → `illegal drugs`). "Or"-lists (#9 knife | gun, #39 nursing | cooking | translation, #46 husband | wife) become alternatives through explicit `REPLACE` entries, not automatically: automatic "or" splitting breaks clause definitions (#11, #29). S1 prototyping.
  - `REPLACE` and `EXTEND` in `build-whatmean-config.ts` hold the per-term overrides, each with its reason. The prototype's cross-term matrix adds `mustInclude`/`mustExclude` so near-twins stay apart (#14 stay vs #15 work; #23 excludes equipment/tools; #37 excludes not; #52 excludes true).
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/n400/oral/build-whatmean-config.ts src/lib/n400/oral/build-whatmean-config.test.ts src/lib/n400/oral/whatmean-oral-config.generated.ts scripts/n400/build-whatmean-oral-config.ts ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "feat(n400app): What-mean oral grading configs (generated + overrides)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: What-mean synonyms, lookup and corpus tests (spec §3.1)

**Files:**
- Create: `apps/website/src/lib/n400/oral/whatmean-oral-aliases.ts`
- Create: `apps/website/src/lib/n400/oral/get-whatmean-config.ts`
- Test: `apps/website/src/lib/n400/oral/whatmean-oral.corpus.test.ts`
- Modify: spec §3.1 (lookup signature)

**Interfaces:**
- Consumes: `WHATMEAN_ORAL_CONFIG` (Task 2), `gradeOralAnswer`, `OralAnswerConfig`, `OralGrade`.
- Produces:
  - `WHATMEAN_ORAL_ALIASES: Readonly<Record<string, string[][]>>`
  - `interface WhatMeanOralConfig { primary: OralAnswerConfig; aliases: OralAnswerConfig | null }`
  - `getWhatMeanOralConfig(id: string): WhatMeanOralConfig | null`
  - `gradeWhatMean(transcript: string, id: string): OralGrade | null` (the better of primary and aliases)

- [ ] **Step 1: Write the failing test**

Create `whatmean-oral.corpus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { getWhatMeanOralConfig, gradeWhatMean } from './get-whatmean-config';
import { keywordsOf, stem } from './normalize';
import { WHATMEAN_ORAL_ALIASES } from './whatmean-oral-aliases';

const verdict = (id: string, said: string) => gradeWhatMean(said, id)!.verdict;
const ids = WHATMEAN_QUESTIONS.map((q) => q.id);

describe('every taught definition', () => {
  it.each(ids)('%s grades correct against its own config', (id) => {
    expect(verdict(id, WHATMEAN_QUESTIONS_BY_ID[id].definitionEn)).toBe('correct');
  });
});

describe('term echo', () => {
  it('reading the term aloud never grades correct for its own item', () => {
    expect(ids.filter((id) => verdict(id, WHATMEAN_QUESTIONS_BY_ID[id].termEn) === 'correct')).toEqual([]);
  });
});

describe('cross-term matrix (owner-reviewed at Gate S1)', () => {
  it('the definition of A grades correct for B only for these pairs', () => {
    const pairs: string[] = [];
    for (const a of ids) for (const b of ids) {
      if (a !== b && verdict(b, WHATMEAN_QUESTIONS_BY_ID[a].definitionEn) === 'correct') pairs.push(`${a}->${b}`);
    }
    // gun ⊂ "use a gun to defend…"; lie ⊂ "lie under oath"; tell ⊂ "promise to tell the truth".
    expect(pairs).toEqual(['wm-37->wm-9', 'wm-48->wm-29', 'wm-49->wm-62']);
  });
});

describe('synonyms', () => {
  const entries = Object.entries(WHATMEAN_ORAL_ALIASES).flatMap(([id, alts]) => alts.map((alt) => [id, alt.join(' ')] as const));

  it.each(entries)('%s "%s" grades correct', (id, said) => {
    expect(verdict(id, said)).toBe('correct');
  });

  it('a synonym grades correct for another term only for these pairs', () => {
    const pairs: string[] = [];
    for (const [id, said] of entries) for (const b of ids) {
      if (b !== id && verdict(b, said) === 'correct') pairs.push(`${id}:${said}->${b}`);
    }
    expect(pairs).toEqual([
      'wm-1:tell citizen->wm-62',
      'wm-32:not tell truth->wm-62',
      'wm-44:more 1 wife->wm-46',
      'wm-44:more 1 husband->wm-46',
      'wm-48:lying under oath->wm-29',
    ]);
  });

  it('no synonym duplicates a generated alternative', () => {
    const dupes = Object.entries(WHATMEAN_ORAL_ALIASES).filter(([id, alts]) => {
      const generated = getWhatMeanOralConfig(id)!.primary.alternatives.map((a) => a.join(' '));
      return alts.some((alt) => generated.includes(alt.join(' ')));
    });
    expect(dupes).toEqual([]);
  });
});

describe('negations, framing, stalls (Review Focus 1, 3)', () => {
  it('dropping the negation never grades correct', () => {
    expect(verdict('wm-6', 'Someone who is a U.S. citizen')).not.toBe('correct');
    expect(verdict('wm-5', 'Someone who lives in the U.S.')).not.toBe('correct');
  });

  it('a polite, framed answer grades like the bare definition', () => {
    expect(verdict('wm-7', 'It means to remove a government by force, officer')).toBe('correct');
  });

  const STALLS = [
    'give me a second', 'let me think', "I don't know", 'not sure', 'no idea', 'say that again',
    'one more time', 'yes', 'now', 'right now', 'good morning', 'I guess', 'I never learned this', 'sorry',
  ];

  it.each(STALLS)('"%s" never grades better than wrong, unless it IS the answer', (said) => {
    const stallStems = keywordsOf(said).map(stem);
    const better = ids.filter((id) => {
      const c = getWhatMeanOralConfig(id)!;
      const own = new Set(
        [c.primary, c.aliases].flatMap((x) => (x ? x.alternatives.flat().flatMap((p) => p.split(' ')) : [])).map(stem),
      );
      const isAnswer = stallStems.length > 0 && stallStems.every((s) => own.has(s));
      return !isAnswer && verdict(id, said) !== 'wrong';
    });
    expect(better).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/whatmean-oral.corpus.test.ts`
Expected: FAIL. It cannot resolve `./get-whatmean-config`.

- [ ] **Step 3: Write the synonyms and the lookup**

Create `whatmean-oral-aliases.ts`:

```ts
// Hand-written synonyms for What-mean definitions, owner-reviewed at Gate S1
// (speaking spec §3.1). Each is graded as its own `single` config (every keyword
// required) and inherits the term's mustExclude. Every entry needs a one-line
// reason and is covered by whatmean-oral.corpus.test.ts. Changes are spec changes.

export const WHATMEAN_ORAL_ALIASES: Readonly<Record<string, string[][]>> = {
  // Claim to be a U.S. citizen — "tell" / "pretend" are how learners phrase "say".
  'wm-1': [['tell citizen'], ['pretend citizen']],
  // Register to vote — "sign up to vote" is the everyday phrasing.
  'wm-2': [['sign up vote']],
  // Overthrow — "take down" for "remove".
  'wm-7': [['take down government force']],
  // Torture — "hurt someone" for "cause great pain to someone".
  'wm-10': [['hurt someone']],
  // Genocide — killing people for their race or religion, without "group".
  'wm-11': [['kill people race'], ['kill people religion']],
  // Kill — "make someone die".
  'wm-12': [['make someone die']],
  // Prison / Jail — "a place where people are locked up".
  'wm-13': [['place people locked']],
  // Crime — "breaking the law".
  'wm-16': [['break law']],
  // Offense — "small" for "minor".
  'wm-17': [['small crime']],
  // Cited — "got / gave a ticket" for "given a ticket".
  'wm-19': [['got ticket police'], ['gave ticket police']],
  // Drug paraphernalia — "tools" for "equipment".
  'wm-24': [['tools use illegal drugs']],
  // Obtain immigration benefit — "get a green card".
  'wm-25': [['get green card']],
  // Illegal gambling — "gambling for money illegally".
  'wm-26': [['gamble money illegal'], ['gamble money illegally']],
  // Lie — "not telling the truth".
  'wm-32': [['not tell truth']],
  // Deported — "sent back to your country", "kicked out".
  'wm-33': [['sent back country'], ['kicked out']],
  // Oath of allegiance — "swear to be loyal".
  'wm-36': [['swear loyal']],
  // Bear arms — "fight in a war" (mustExclude "not" keeps non-combatant out).
  'wm-37': [['fight war']],
  // Polygamy — "more than one wife / husband".
  'wm-44': [['more 1 wife'], ['more 1 husband']],
  // Annulled — "the marriage was canceled".
  'wm-47': [['marriage cancel']],
  // Perjury — "lying under oath" ("lying" does not stem to "lie").
  'wm-48': [['lying under oath']],
  // Verify — "show" / "confirm" something is true.
  'wm-50': [['show true'], ['confirm true']],
  // Exempt — "not required", "do not need to".
  'wm-52': [['not required'], ['not need']],
  // Militia — "an army not from the government".
  'wm-53': [['army not government']],
  // Vigilante unit — "not real police".
  'wm-55': [['not real police']],
  // Alternative sentencing — "a punishment instead of jail".
  'wm-56': [['punishment instead jail']],
  // Rehabilitative program — "a program to help someone recover".
  'wm-57': [['program help recover']],
  // Prior / Previous — "earlier".
  'wm-60': [['earlier']],
};
```

Create `get-whatmean-config.ts`:

```ts
// Resolves What-mean grading: the generated config plus the owner-reviewed
// synonyms. Synonyms are graded as their own `single` config (every keyword
// required, inheriting mustExclude) because a `phrase` config's minKeywords
// would make a shorter synonym unreachable; the better verdict wins.
// Speaking spec §3.1 (S1 ruling 2).

import { gradeOralAnswer } from './grade-oral';
import type { OralAnswerConfig, OralGrade } from './types';
import { WHATMEAN_ORAL_ALIASES } from './whatmean-oral-aliases';
import { WHATMEAN_ORAL_CONFIG } from './whatmean-oral-config.generated';

export interface WhatMeanOralConfig {
  primary: OralAnswerConfig;
  /** Synonyms: every keyword required; inherits the primary's mustExclude. */
  aliases: OralAnswerConfig | null;
}

export function getWhatMeanOralConfig(id: string): WhatMeanOralConfig | null {
  const primary = WHATMEAN_ORAL_CONFIG[id];
  if (!primary) return null;
  const alts = WHATMEAN_ORAL_ALIASES[id];
  const aliases: OralAnswerConfig | null = alts
    ? { type: 'single', alternatives: alts, ...(primary.mustExclude ? { mustExclude: primary.mustExclude } : {}) }
    : null;
  return { primary, aliases };
}

const RANK = { wrong: 0, near: 1, correct: 2 } as const;

export function gradeWhatMean(transcript: string, id: string): OralGrade | null {
  const config = getWhatMeanOralConfig(id);
  if (!config) return null;
  const primary = gradeOralAnswer(transcript, config.primary);
  if (!config.aliases) return primary;
  const alias = gradeOralAnswer(transcript, config.aliases);
  return RANK[alias.verdict] > RANK[primary.verdict] ? alias : primary;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/oral/whatmean-oral.corpus.test.ts`
Expected: PASS: 62 + 1 + 1 + 35 synonym rows + 2 + 2 + 14 stall rows = 117 tests.

If either allowlist differs, stop and run `systematic-debugging` before changing it. The prototype measured exactly these pairs with these exact rules.

- [ ] **Step 5: Spec §3.1 lookup signature**

In the speaking spec §3.1, replace the bullet

```markdown
- **Lookup:** `getWhatMeanOralConfig(id: string): OralAnswerConfig | null` merges generated plus aliases.
```

with

```markdown
- **Lookup:** `getWhatMeanOralConfig(id): { primary; aliases } | null` and `gradeWhatMean(transcript, id)` in `get-whatmean-config.ts`. Synonyms are graded as their own `single` config (every keyword required, inheriting the primary's `mustExclude`), and the better verdict wins. Merging them into a `phrase` config made 13 of 25 synonyms unreachable (S1 prototyping).
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/whatmean-oral-aliases.ts src/lib/n400/oral/get-whatmean-config.ts src/lib/n400/oral/whatmean-oral.corpus.test.ts ../../docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md
git commit -m "feat(n400app): What-mean synonyms, lookup and corpus tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Yes/No intent classifier (spec §3.2)

**Files:**
- Create: `apps/website/src/lib/n400/oral/yes-no-intent.ts`
- Test: `apps/website/src/lib/n400/oral/yes-no-intent.test.ts`

**Interfaces:**
- Produces:
  - `type YesNoIntent = 'yes' | 'no' | 'unclear'`
  - `classifyYesNo(transcript: string): YesNoIntent`
  - `gradeYesNo(transcript: string, expected: 'yes' | 'no'): 'correct' | 'wrong' | 'unclear'`

- [ ] **Step 1: Write the failing test**

Create `yes-no-intent.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyYesNo, gradeYesNo, type YesNoIntent } from './yes-no-intent';

// Speaking spec §3.2. Prototyped 2026-09-25; every row below is a real phrasing.
const TABLE: [string, YesNoIntent][] = [
  ['No', 'no'], ['No, officer.', 'no'], ['No sir', 'no'], ["No ma'am", 'no'], ['Nope', 'no'], ['Nah', 'no'],
  ['Never', 'no'], ['No, never', 'no'], ['I have never been', 'no'], ['I have not', 'no'], ["I haven't", 'no'],
  ['No, I have not', 'no'], ['I have not been arrested', 'no'], ['I did not', 'no'], ["I didn't", 'no'],
  ['I am not', 'no'], ["I'm not", 'no'], ['I do not', 'no'], ["I don't", 'no'], ['Of course not', 'no'],
  ['Absolutely not', 'no'], ['Definitely not', 'no'], ['No I never did that', 'no'],
  ['Yes', 'yes'], ['Yes, officer', 'yes'], ['Yeah', 'yes'], ['Yep', 'yes'], ['Yeah I have', 'yes'], ['I did', 'yes'],
  ['I have', 'yes'], ['I am', 'yes'], ['I was', 'yes'], ['Of course', 'yes'], ['Correct', 'yes'], ['Yes I do', 'yes'],
  ["I don't know", 'unclear'], ['I do not know', 'unclear'], ['not sure', 'unclear'], ["I'm not sure", 'unclear'],
  ["I don't remember", 'unclear'], ['No idea', 'unclear'], ['Say again', 'unclear'], ['Can you repeat the question', 'unclear'],
  ['Yes no', 'unclear'], ['', 'unclear'], ['um', 'unclear'], ['Maybe', 'unclear'], ['Yes, I have not', 'unclear'],
];

describe('classifyYesNo (speaking spec §3.2)', () => {
  it.each(TABLE)('%j → %s', (said, intent) => {
    expect(classifyYesNo(said)).toBe(intent);
  });
});

describe('gradeYesNo', () => {
  it('matches the expected answer; unclear is never graded', () => {
    expect(gradeYesNo('No, officer', 'no')).toBe('correct');
    expect(gradeYesNo('Yes', 'no')).toBe('wrong');
    expect(gradeYesNo("I don't know", 'no')).toBe('unclear');
    expect(gradeYesNo('Yes I do', 'yes')).toBe('correct');
  });

  it('never uses the generic stall list, which drops "yes" (spec §3.2)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/n400/oral/yes-no-intent.ts'), 'utf8');
    expect(src).not.toMatch(/transcriptStems|dropStalls|STALL_PHRASES/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/yes-no-intent.test.ts`
Expected: FAIL. It cannot resolve `./yes-no-intent`.

- [ ] **Step 3: Implement**

Create `yes-no-intent.ts`:

```ts
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
];
const NO_WORDS: ReadonlySet<string> = new Set(['no', 'nope', 'nah', 'never', 'not']);
const YES_WORDS: ReadonlySet<string> = new Set(['yes', 'yeah', 'yep', 'yup', 'correct']);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/oral/yes-no-intent.test.ts`
Expected: PASS (48 table rows + 2 = 50 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/yes-no-intent.ts src/lib/n400/oral/yes-no-intent.test.ts
git commit -m "feat(n400app): Yes/No intent classifier for spoken answers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shared spoken-item grader (spec §3.3)

**Files:**
- Create: `apps/website/src/lib/n400/oral/grade-spoken-item.ts`
- Test: `apps/website/src/lib/n400/oral/grade-spoken-item.test.ts`

**Interfaces:**
- Consumes:
  - `getOralAnswerConfig(qid, location)` and `OralLocation` from `./get-oral-config`;
  - `gradeOralAnswer` from `./grade-oral`;
  - `nearPromptAnswer(transcript, config, answers)` from `./voice-outcome`;
  - `correctAnswersFor(question, stateCode, districtNumber)` from `../quiz-engine`;
  - `N400_QUESTIONS_BY_ID` (a `Map<number, N400Question>`) from `../questions-data`;
  - `WHATMEAN_QUESTIONS_BY_ID` from `../whatmean-data`; `YESNO_QUESTIONS_BY_ID` from `../yesno-data`;
  - `getWhatMeanOralConfig`, `gradeWhatMean` (Task 3); `gradeYesNo` (Task 4).
- Produces:
  - `type SpokenItem`
  - `spokenItemFromId(itemId: string): SpokenItem | null`
  - `canSpeak(item: SpokenItem, location: OralLocation): boolean`
  - `interface SpokenGrade { verdict: 'correct' | 'near' | 'wrong' | 'unclear'; nearAnswer: string | null }`
  - `gradeSpokenItem(item: SpokenItem, transcript: string, location: OralLocation): SpokenGrade`

- [ ] **Step 1: Write the failing test**

Create `grade-spoken-item.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canSpeak, gradeSpokenItem, spokenItemFromId } from './grade-spoken-item';

const TX = { stateCode: 'TX' as const, districtNumber: null };
const DC = { stateCode: 'DC' as const, districtNumber: null };

describe('spokenItemFromId', () => {
  it('reads civics, What-mean and Yes/No ids', () => {
    expect(spokenItemFromId('civ-12')).toEqual({ kind: 'civics', qid: 12 });
    expect(spokenItemFromId('wm-3')).toEqual({ kind: 'whatmean', id: 'wm-3' });
    expect(spokenItemFromId('yn-7')).toEqual({ kind: 'yesno', id: 'yn-7' });
  });

  it('unknown ids are null', () => {
    expect(spokenItemFromId('civ-999')).toBeNull();
    expect(spokenItemFromId('wm-999')).toBeNull();
    expect(spokenItemFromId('hello')).toBeNull();
  });
});

describe('canSpeak (Review Focus 4)', () => {
  it('is true for gradable items', () => {
    expect(canSpeak({ kind: 'civics', qid: 2 }, TX)).toBe(true);
    expect(canSpeak({ kind: 'civics', qid: 23 }, TX)).toBe(true);
    expect(canSpeak({ kind: 'whatmean', id: 'wm-1' }, TX)).toBe(true);
    expect(canSpeak({ kind: 'yesno', id: 'yn-1' }, TX)).toBe(true);
  });

  it('is false for a location question without a spoken answer (DC senators / capital)', () => {
    expect(canSpeak({ kind: 'civics', qid: 23 }, DC)).toBe(false);
    expect(canSpeak({ kind: 'civics', qid: 62 }, DC)).toBe(false);
  });
});

describe('gradeSpokenItem', () => {
  it('civics: correct, and near offers the taught answer', () => {
    expect(gradeSpokenItem({ kind: 'civics', qid: 2 }, 'the constitution', TX)).toEqual({ verdict: 'correct', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'civics', qid: 2 }, 'the institution', TX)).toEqual({
      verdict: 'near',
      nearAnswer: 'The U.S. Constitution',
    });
  });

  it('civics without a spoken answer is wrong, never a throw (Review Focus 4)', () => {
    expect(gradeSpokenItem({ kind: 'civics', qid: 23 }, 'I do not know', DC)).toEqual({ verdict: 'wrong', nearAnswer: null });
  });

  it('What-mean: correct, near offers the taught definition, wrong', () => {
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'to remove a government by force', TX).verdict).toBe('correct');
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'to remove the government', TX)).toEqual({
      verdict: 'near',
      nearAnswer: 'To remove a government by force.',
    });
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-7' }, 'overthrow', TX).verdict).toBe('wrong');
  });

  it('Yes/No: correct, wrong, unclear — never near', () => {
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, 'No, officer', TX)).toEqual({ verdict: 'correct', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, 'Yes', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-1' }, "I don't know", TX)).toEqual({ verdict: 'unclear', nearAnswer: null });
  });

  it('an unknown id inside a SpokenItem is wrong, never a throw', () => {
    expect(gradeSpokenItem({ kind: 'whatmean', id: 'wm-999' }, 'anything', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
    expect(gradeSpokenItem({ kind: 'yesno', id: 'yn-999' }, 'no', TX)).toEqual({ verdict: 'wrong', nearAnswer: null });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/n400/oral/grade-spoken-item.test.ts`
Expected: FAIL. It cannot resolve `./grade-spoken-item`.

- [ ] **Step 3: Implement**

Create `grade-spoken-item.ts`:

```ts
// One grader for every spoken interview item (speaking spec §3.3, S3): Civics,
// What-mean and Yes/No. Pure: the same code grades practice, the Speaking mock
// and the Full interview on the client. The standalone Civics voice mock keeps
// its server finalize.

import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import { WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { YESNO_QUESTIONS_BY_ID } from '../yesno-data';
import { getOralAnswerConfig, type OralLocation } from './get-oral-config';
import { getWhatMeanOralConfig, gradeWhatMean } from './get-whatmean-config';
import { gradeOralAnswer } from './grade-oral';
import { nearPromptAnswer } from './voice-outcome';
import { gradeYesNo } from './yes-no-intent';

export type SpokenItem =
  | { kind: 'civics'; qid: number }
  | { kind: 'whatmean'; id: string }
  | { kind: 'yesno'; id: string };

export interface SpokenGrade {
  verdict: 'correct' | 'near' | 'wrong' | 'unclear';
  /** The answer to offer in "Có phải bạn nói …?"; only set for `near`. */
  nearAnswer: string | null;
}

const WRONG: SpokenGrade = { verdict: 'wrong', nearAnswer: null };

/** "civ-12" | "wm-3" | "yn-7" → the item, or null when the id is unknown. */
export function spokenItemFromId(itemId: string): SpokenItem | null {
  const civics = /^civ-(\d+)$/.exec(itemId);
  if (civics) {
    const qid = Number(civics[1]);
    return N400_QUESTIONS_BY_ID.has(qid) ? { kind: 'civics', qid } : null;
  }
  if (WHATMEAN_QUESTIONS_BY_ID[itemId]) return { kind: 'whatmean', id: itemId };
  if (YESNO_QUESTIONS_BY_ID[itemId]) return { kind: 'yesno', id: itemId };
  return null;
}

/** False when the item has nothing to grade a spoken answer against (it stays multiple choice). */
export function canSpeak(item: SpokenItem, location: OralLocation): boolean {
  if (item.kind === 'civics') return getOralAnswerConfig(item.qid, location) !== null;
  if (item.kind === 'whatmean') return getWhatMeanOralConfig(item.id) !== null;
  return Boolean(YESNO_QUESTIONS_BY_ID[item.id]);
}

export function gradeSpokenItem(item: SpokenItem, transcript: string, location: OralLocation): SpokenGrade {
  if (item.kind === 'yesno') {
    const q = YESNO_QUESTIONS_BY_ID[item.id];
    return q ? { verdict: gradeYesNo(transcript, q.answer), nearAnswer: null } : WRONG;
  }

  if (item.kind === 'whatmean') {
    const q = WHATMEAN_QUESTIONS_BY_ID[item.id];
    const grade = q ? gradeWhatMean(transcript, item.id) : null;
    if (!q || !grade) return WRONG;
    return { verdict: grade.verdict, nearAnswer: grade.verdict === 'near' ? q.definitionEn : null };
  }

  const q = N400_QUESTIONS_BY_ID.get(item.qid);
  const config = getOralAnswerConfig(item.qid, location);
  if (!q || !config) return WRONG;
  const verdict = gradeOralAnswer(transcript, config).verdict;
  if (verdict !== 'near') return { verdict, nearAnswer: null };
  const answers = correctAnswersFor(q, location.stateCode, location.districtNumber).map((a) => a.en);
  const nearAnswer = nearPromptAnswer(transcript, config, answers);
  // A near with nothing to offer cannot be confirmed, so it counts as wrong (as in Civics practice).
  return nearAnswer === null ? WRONG : { verdict: 'near', nearAnswer };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/n400/oral/grade-spoken-item.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/grade-spoken-item.ts src/lib/n400/oral/grade-spoken-item.test.ts
git commit -m "feat(n400app): shared spoken-item grader (civics, What-mean, Yes/No)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Gate S1 review doc (spec §12)

**Files:**
- Create: `apps/website/scripts/n400/speaking-grading-gate-report.ts`
- Create (generated): `docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md`

**Interfaces:**
- Consumes: `WHATMEAN_QUESTIONS`; `getWhatMeanOralConfig`, `gradeWhatMean` (Task 3); `classifyYesNo` (Task 4); `OralAnswerConfig`.
- Produces: the review doc only.

- [ ] **Step 1: Write the report script**

Create `scripts/n400/speaking-grading-gate-report.ts`:

```ts
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
  'Yes', 'Yeah I have', 'Of course', "I don't know", 'Not sure', 'No idea', 'Say again', 'Yes no', 'Maybe',
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

How to read it: "Graded as" lists the words that must be said. \`[a + b]\` means both words; \`OR\` separates accepted answers; "≥N words of" is the lenient rule for long definitions. Synonyms are extra accepted phrasings (every word required). The sample is a natural learner answer, not the taught wording.

## What-mean (62 terms)

Natural sample answers: ${counts.correct ?? 0} correct · ${counts.near ?? 0} near · ${counts.wrong ?? 0} wrong.

| # | Term | Taught definition | Graded as | Synonyms | Sample → verdict |
|---|---|---|---|---|---|
${rows.join('\n')}

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
- #3 Vote: "Choose a leader" is **near** because the taught definition says "in an election". Accept, or add "choose a leader" as a synonym? <keep near / add>
- Cross-term matches OK? <yes / tighten>
- Gate S1 pass? <yes / no>
`;

writeFileSync(out, body);
console.log(`wrote ${out}`);
```

- [ ] **Step 2: Generate the doc**

Run: `npx tsx scripts/n400/speaking-grading-gate-report.ts`
Expected: `wrote …/docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md`.

- [ ] **Step 3: Read the doc and check its numbers**

Run: `grep -c "^| [0-9]" ../../docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md && grep "Natural sample answers" ../../docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md`
Expected:
- `62`: the What-mean rows. The Yes/No rows start with a letter, so this grep does not count them.
- `Natural sample answers: 61 correct · 1 near · 0 wrong.` The one near is #3.

- [ ] **Step 4: Gate**

Run `npm run type-check`, `npm run test` and `npm run build`, separately.
Expected:
- type-check: 0 errors;
- test: the only failure is the pre-existing `mobile-layout.test.ts`;
- build: succeeds.

- [ ] **Step 5: Commit**

```bash
git add scripts/n400/speaking-grading-gate-report.ts ../../docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md
git commit -m "docs(n400app): Gate S1 grading review doc (What-mean 62 terms + Yes/No)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**GATE S1 — stop.** The owner reviews the doc. Slice S2 (practice) waits for "Gate S1 pass: yes".
