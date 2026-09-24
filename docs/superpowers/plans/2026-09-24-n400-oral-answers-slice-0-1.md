# N400 Civics Oral Answers — Slice 0 (Device Spike) + Slice 1 (Grading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove Web Speech works on the devices that matter (Slice 0), then ship a deterministic, fully tested oral-answer grading engine for all 128 Civics questions (Slice 1) — no UI yet.

**Architecture:** Slice 0 is a throwaway static HTML probe on an unmerged branch, deployed as a Vercel preview and run by the owner on real phones. Slice 1 is pure TypeScript under `apps/website/src/lib/n400/oral/`: a normalizer, a grading engine, a config generator that emits a committed `oral-answer-config.generated.ts`, a hand-written alias file, and a config resolver for location-based questions. Everything is unit-tested with vitest; nothing touches React, Supabase or the network.

**Tech Stack:** TypeScript, vitest 2, `edit-distance` (already a dependency), `tsx` (already a devDependency) for the generator script.

**Spec:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.1). Read §3 (grading), §11 (testing), §12 (build order and gates) before starting.

**Scope note:** Slices 2–4 (speech hook, MicAnswerPanel, practice, migration, mock, analytics, flags) get their own plan **after Gate 0 and Gate 1 pass**. The device spike results decide how the hook must behave on iOS / in-app browsers, so writing that code now would be guessing.

## Global Constraints

- All app code lives in `apps/website/`; run every command from `apps/website/` unless a step says otherwise.
- Test runner is vitest (`npx vitest run <file>`); full gate is `npm run type-check && npm run test && npm run build`.
- `edit-distance` is imported as `import { levenshtein } from 'edit-distance'` (ambient types in `src/lib/n400/edit-distance.d.ts`).
- Modules under `src/lib/n400/oral/` import each other and `../questions-data` with **relative** paths so `npx tsx` can run the generator without the `@/` alias.
- **D8:** edit-distance tolerance never produces `correct` — only `near`.
- **D10:** grading rules, generator overrides, and aliases are spec-governed. Do not change them to make a test pass; stop and report instead.
- **D11:** Slice 1 does not start until the owner signs off Gate 0. Slice 2 does not start until the owner signs off Gate 1.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Slice 0 branch `spike/n400-voice-stt` is **never merged**. Slice 1 works on branch `feat/n400-oral-grading` from `main`.

## Review Focus

1. Same answer, different recognizer formatting — Safari yields "Twenty-seven.", Chrome yields "27" — must grade identically (Task 2 test `formats numbers the same regardless of recognizer style`).
2. Empty or whitespace-only transcript (recognizer returned nothing) must grade `wrong` without throwing (Task 3 test `empty transcript is wrong`).
3. Filler-only speech ("um, I think…") must grade `wrong`, not `near` (Task 3 test `filler-only speech is wrong`).
4. Curly apostrophes and contractions from iOS ("can’t", "don’t") must keep the negation (Task 2 test `keeps negation from contractions and curly quotes`).
5. Transcript words that collide with JavaScript object keys ("constructor", "toString") must not turn into `NaN` numbers (Task 2 test `does not treat object prototype keys as numbers`).

---

## Slice 0 — Device spike

### Task 1: Voice probe page + device matrix (throwaway)

**Files:**
- Create (branch `spike/n400-voice-stt` only): `apps/website/public/voice-spike.html`
- Modify (branch `spike/n400-voice-stt` only): `apps/website/src/middleware.ts:14`
- Create (on `main`): `docs/superpowers/spikes/2026-09-24-n400-voice-spike-results.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the filled results doc — the only artifact Slice 2's plan reads.

- [ ] **Step 1: Create the spike branch**

```bash
git switch main && git pull --ff-only
git switch -c spike/n400-voice-stt
```

- [ ] **Step 2: Let the static page bypass the locale redirect**

In `apps/website/src/middleware.ts`, change line 14:

```ts
const SKIP_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt', '/voice-spike.html'];
```

- [ ] **Step 3: Write the probe page**

Create `apps/website/public/voice-spike.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice spike</title>
<style>
  body { font: 16px/1.4 system-ui, sans-serif; margin: 0; padding: 16px; background: #fff; color: #111; }
  button { font-size: 18px; padding: 14px 18px; margin: 6px 6px 6px 0; border-radius: 12px; border: 1px solid #0f766e; background: #0f766e; color: #fff; }
  button.secondary { background: #fff; color: #0f766e; }
  #state { font-weight: 700; }
  #log { font: 12px/1.35 ui-monospace, monospace; white-space: pre-wrap; background: #f4f4f5; padding: 8px; border-radius: 8px; max-height: 45vh; overflow: auto; }
  .row { margin: 8px 0; }
</style>
</head>
<body>
  <h1>Voice spike</h1>
  <div class="row">API: <span id="api"></span></div>
  <div class="row">UA: <span id="ua" style="font-size:12px"></span></div>
  <div class="row">State: <span id="state">idle</span> · Answers with transcript: <span id="ok">0</span> / <span id="tries">0</span></div>
  <div class="row">Say: <b id="prompt"></b></div>
  <div class="row">Heard: <span id="heard"></span></div>
  <button id="start">🎤 Speak</button>
  <button id="stop" class="secondary">Stop</button>
  <button id="copy" class="secondary">Copy results</button>
  <div id="log"></div>
<script>
  const PROMPTS = ['The Constitution', 'Twenty-seven', 'Checks and balances', 'Congress, president, and the courts', 'Freedom of speech'];
  const $ = (id) => document.getElementById(id);
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, tries = 0, ok = 0, gotText = false, t0 = 0;
  const lines = [];
  function log(msg) {
    const line = `${((performance.now() - t0) / 1000).toFixed(2)}s ${msg}`;
    lines.push(line); $('log').textContent = lines.join('\n'); $('log').scrollTop = 1e9;
  }
  function setState(s) { $('state').textContent = s; log('state=' + s); }
  $('api').textContent = Rec ? (window.SpeechRecognition ? 'SpeechRecognition' : 'webkitSpeechRecognition') : 'MISSING';
  $('ua').textContent = navigator.userAgent;
  $('prompt').textContent = PROMPTS[0];
  document.addEventListener('visibilitychange', () => {
    log('visibility=' + document.visibilityState);
    if (document.visibilityState === 'hidden' && rec) { rec.abort(); log('aborted on hide'); }
  });
  $('start').onclick = () => {
    if (!Rec) { log('no API'); return; }
    if (rec) { log('already running — ignored'); return; }
    if (!t0) t0 = performance.now();
    tries++; $('tries').textContent = tries; gotText = false; $('heard').textContent = '';
    rec = new Rec();
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onstart = () => setState('listening');
    rec.onaudiostart = () => log('audiostart');
    rec.onspeechstart = () => log('speechstart');
    rec.onspeechend = () => setState('processing');
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const text = r[0].transcript;
      $('heard').textContent = text;
      log(`result final=${r.isFinal} conf=${r[0].confidence} "${text}"`);
      if (r.isFinal && text.trim()) gotText = true;
    };
    rec.onerror = (e) => log('error=' + e.error + (e.message ? ' ' + e.message : ''));
    rec.onend = () => {
      log('end gotText=' + gotText);
      if (gotText) { ok++; $('ok').textContent = ok; $('prompt').textContent = PROMPTS[ok % PROMPTS.length]; }
      rec = null; setState('idle');
    };
    try { rec.start(); setState('requesting/starting'); } catch (err) { log('start threw ' + err.name + ' ' + err.message); rec = null; }
    const mine = rec;
    setTimeout(() => { if (rec && rec === mine) { log('15s hard stop'); rec.stop(); } }, 15000);
  };
  $('stop').onclick = () => { if (rec) { rec.stop(); log('stop pressed'); } };
  $('copy').onclick = async () => {
    const text = `UA: ${navigator.userAgent}\nAPI: ${$('api').textContent}\nok ${ok}/${tries}\n\n${lines.join('\n')}`;
    try { await navigator.clipboard.writeText(text); log('copied'); } catch { log('clipboard blocked — screenshot the log instead'); }
  };
</script>
</body>
</html>
```

- [ ] **Step 4: Verify locally**

```bash
cd apps/website && npm run dev
```
Open `http://localhost:3000/voice-spike.html` in desktop Chrome. Expected: page loads without redirect, `API: webkitSpeechRecognition` (or `SpeechRecognition`), pressing 🎤 Speak and saying "The Constitution" ends with `ok 1/1` and a `result final=true` log line.

- [ ] **Step 5: Commit on the spike branch**

```bash
git add apps/website/public/voice-spike.html apps/website/src/middleware.ts
git commit -m "$(cat <<'EOF'
spike(n400app): throwaway Web Speech probe page — never merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Push for a Vercel preview — ask the owner first**

Pushing a branch triggers a Vercel preview build; confirm with the owner before running:

```bash
git push -u origin spike/n400-voice-stt
```
Get the preview URL from the Vercel dashboard or the GitHub commit status. If the preview has Deployment Protection enabled, the owner creates a Shareable Link in Vercel so it opens inside the Facebook in-app browser.

- [ ] **Step 7: Write the results template on `main`**

```bash
git switch main
mkdir -p docs/superpowers/spikes
```
Create `docs/superpowers/spikes/2026-09-24-n400-voice-spike-results.md`:

```markdown
# N400 Voice Spike — Results

**Preview URL:** <fill in>
**Tester / date:** <fill in>
**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §12

## Script (per environment)

1. Open `<preview>/voice-spike.html` fresh (first run must show the mic permission prompt).
2. Press 🎤 Speak and say the prompt shown; repeat until 5 answers.
3. Second run: start answering, switch to another app mid-answer, come back, finish 5 answers without reloading.
4. Press "Copy results" (or screenshot the log) and paste below.

**GO for an environment:** all 10 answers produce a transcript, no stuck state, no reload needed.

## Matrix

| Environment | Device / OS | API present | Permission granted | Transcript returned | 2nd+ answer works without reload | Survives background | GO? |
|---|---|---|---|---|---|---|---|
| iPhone Safari | | | | | | | |
| Android Chrome | | | | | | | |
| Desktop Chrome | | | | | | | |
| Facebook in-app iOS | | | | | | | |
| Facebook in-app Android | | | | | | | |

## Facebook in-app traffic share

<fill in: GA4 → Tech → Browser (look for "Safari (in-app)" / "Android Webview") and the share of first-touch attributions carrying `fbclid` / `utm_source=facebook`>

## Raw logs

<paste per environment>

## Decision (owner)

- Slice 0 pass (iPhone Safari, Android Chrome, desktop Chrome all GO)? <yes/no>
- Facebook in-app strategy: (a) open-in-browser prompt / (b) keyboard-dictation fallback / (c) revisit server STT — <choice + reason>
```

- [ ] **Step 8: Commit the template on `main`**

```bash
git add docs/superpowers/spikes/2026-09-24-n400-voice-spike-results.md
git commit -m "$(cat <<'EOF'
docs(n400app): voice spike results template

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: GATE 0 — stop and hand off to the owner**

The owner runs the script on real devices and fills the results doc. **Do not start Task 2 until the owner writes "Slice 0 pass: yes" in the Decision section.** If iPhone Safari or Android Chrome is NO-GO, the feature is reassessed (spec §12). After the decision, delete the remote spike branch (ask the owner first): `git push origin --delete spike/n400-voice-stt`.

---

## Slice 1 — Grading

Start Slice 1 from a fresh branch:

```bash
git switch main && git pull --ff-only && git switch -c feat/n400-oral-grading
```

### Task 2: Types + speech normalizer

**Files:**
- Create: `apps/website/src/lib/n400/oral/types.ts`
- Create: `apps/website/src/lib/n400/oral/normalize.ts`
- Test: `apps/website/src/lib/n400/oral/normalize.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts`: `OralAnswerType`, `OralAnswerConfig`, `OralVerdict`, `OralGrade` (exact shapes below).
  - `normalize.ts`: `NEGATIONS: ReadonlySet<string>`, `normalizeTokens(text: string): string[]`, `stem(word: string): string`, `contentTokens(tokens: readonly string[], opts?: { keepQualifiers?: boolean }): string[]`, `keywordsOf(text: string): string[]`, `transcriptStems(text: string): string[]`.

- [ ] **Step 1: Write the types**

Create `apps/website/src/lib/n400/oral/types.ts`:

```ts
// Oral-answer grading types. Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §3.

export type OralAnswerType = 'single' | 'phrase' | 'enumeration';

export interface OralAnswerConfig {
  type: OralAnswerType;
  /** Any-of alternatives; each inner array is the parts of one answer, ALL required. A part is space-separated keywords. */
  alternatives: string[][];
  /** phrase only: keywords required. */
  minKeywords?: number;
  /** Keywords that must match exactly regardless of minKeywords (negation, numbers). */
  mustInclude?: string[];
  /** Any of these in the transcript blocks `correct` (the verdict falls to at best `near`). */
  mustExclude?: string[];
}

export type OralVerdict = 'correct' | 'near' | 'wrong';

export interface OralGrade {
  verdict: OralVerdict;
  matched: string[];
  missing: string[];
}
```

- [ ] **Step 2: Write the failing normalizer tests**

Create `apps/website/src/lib/n400/oral/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contentTokens, keywordsOf, normalizeTokens, stem, transcriptStems } from './normalize';

describe('normalizeTokens', () => {
  it('lowercases and strips punctuation, hyphens become spaces', () => {
    expect(normalizeTokens('Self-government!')).toEqual(['self', 'government']);
  });

  it('formats numbers the same regardless of recognizer style', () => {
    expect(normalizeTokens('Twenty-seven.')).toEqual(['27']);
    expect(normalizeTokens('27')).toEqual(['27']);
    expect(normalizeTokens('four hundred thirty five')).toEqual(['435']);
    expect(normalizeTokens('One hundred (100)')).toEqual(['100', '100']);
  });

  it('turns ordinals into digits', () => {
    expect(normalizeTokens('the fourteenth amendment')).toEqual(['the', '14', 'amendment']);
    expect(normalizeTokens('14th Amendment')).toEqual(['14', 'amendment']);
    expect(normalizeTokens('July 4th, 1776')).toEqual(['july', '4', '1776']);
  });

  it('canonicalizes world war numbering before dropping single letters', () => {
    expect(normalizeTokens('After World War I')).toEqual(['after', 'world', 'war', '1']);
    expect(normalizeTokens('world war two')).toEqual(['world', 'war', '2']);
    expect(normalizeTokens('World War II')).toEqual(['world', 'war', '2']);
  });

  it('keeps negation from contractions and curly quotes', () => {
    expect(normalizeTokens('can’t')).toEqual(['can', 'not']);
    expect(normalizeTokens("don't")).toEqual(['do', 'not']);
    expect(normalizeTokens('cannot')).toEqual(['can', 'not']);
  });

  it('drops possessive s and single-letter tokens', () => {
    expect(normalizeTokens("President's Cabinet")).toEqual(['president', 'cabinet']);
    expect(normalizeTokens('Washington, D.C.')).toEqual(['washington']);
  });

  it('does not treat object prototype keys as numbers', () => {
    expect(normalizeTokens('constructor toString')).toEqual(['constructor', 'tostring']);
  });
});

describe('stem', () => {
  it.each([
    ['courts', 'court'], ['court', 'court'],
    ['writes', 'writ'], ['write', 'writ'],
    ['laws', 'law'], ['states', 'stat'], ['state', 'stat'],
    ['freed', 'fre'], ['free', 'fre'],
    ['voting', 'vot'], ['voted', 'vot'], ['vote', 'vot'],
    ['taxes', 'tax'], ['colonies', 'colony'],
    ['congress', 'congress'], ['americans', 'american'],
  ])('%s -> %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });

  it('leaves digits and short words alone', () => {
    expect(stem('435')).toBe('435');
    expect(stem('war')).toBe('war');
  });
});

describe('contentTokens / keywordsOf', () => {
  it('drops stopwords and qualifiers', () => {
    expect(contentTokens(normalizeTokens('I think the U.S. Constitution'))).toEqual(['constitution']);
    expect(contentTokens(normalizeTokens('the United States of America'))).toEqual([]);
  });

  it('keeps qualifiers when asked', () => {
    expect(contentTokens(normalizeTokens('The United States'), { keepQualifiers: true })).toEqual(['united', 'states']);
  });

  it('keywordsOf falls back to qualifiers when nothing else is left, and dedupes by stem', () => {
    expect(keywordsOf('The United States')).toEqual(['united', 'states']);
    expect(keywordsOf('Freed the slaves, free slaves')).toEqual(['freed', 'slaves']);
  });

  it('never drops negation', () => {
    expect(keywordsOf('Powers not given to the federal government')).toEqual(['powers', 'not', 'given', 'federal', 'government']);
  });

  it('treats "day" as filler', () => {
    expect(keywordsOf("New Year's Day")).toEqual(['new', 'year']);
  });
});

describe('transcriptStems', () => {
  it('keeps qualifiers and stems', () => {
    expect(transcriptStems('the United States')).toEqual(['unit', 'stat']);
  });

  it('filler-only speech yields nothing', () => {
    expect(transcriptStems('um, I think… uh')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/normalize.test.ts`
Expected: FAIL — `Failed to resolve import "./normalize"`.

- [ ] **Step 4: Implement the normalizer**

Create `apps/website/src/lib/n400/oral/normalize.ts`:

```ts
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

export function normalizeTokens(text: string): string[] {
  let s = text
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
  let acc: number | null = null;
  for (const t of raw) {
    if (t === 'hundred') {
      acc = (acc ?? 1) * 100;
      continue;
    }
    const n = NUMBER_WORDS.get(t);
    if (n !== undefined) {
      acc = (acc ?? 0) + n;
      continue;
    }
    if (acc !== null) {
      out.push(String(acc));
      acc = null;
    }
    const ord = ORDINAL_WORDS.get(t);
    if (ord !== undefined) {
      out.push(String(ord));
      continue;
    }
    if (t.length === 1 && !/\d/.test(t)) continue;
    out.push(t);
  }
  if (acc !== null) out.push(String(acc));
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/oral/normalize.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/types.ts src/lib/n400/oral/normalize.ts src/lib/n400/oral/normalize.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): speech-transcript normalizer for oral answers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Grading engine

**Files:**
- Create: `apps/website/src/lib/n400/oral/grade-oral.ts`
- Test: `apps/website/src/lib/n400/oral/grade-oral.test.ts`

**Interfaces:**
- Consumes: `transcriptStems`, `stem` from `./normalize`; `OralAnswerConfig`, `OralGrade`, `OralVerdict` from `./types`.
- Produces: `gradeOralAnswer(transcript: string, config: OralAnswerConfig): OralGrade`.

Tests here use hand-written configs so the engine is verified independently of the generator.

- [ ] **Step 1: Write the failing engine tests**

Create `apps/website/src/lib/n400/oral/grade-oral.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gradeOralAnswer } from './grade-oral';
import type { OralAnswerConfig } from './types';

const single = (...alts: string[]): OralAnswerConfig => ({ type: 'single', alternatives: alts.map((a) => [a]) });

describe('gradeOralAnswer — single', () => {
  const constitution = single('constitution');

  it('exact keyword with extra words is correct', () => {
    expect(gradeOralAnswer('I think it is the constitution', constitution).verdict).toBe('correct');
  });

  it('a different real word within edit distance is only near (D8)', () => {
    expect(gradeOralAnswer('the institution', constitution).verdict).toBe('near');
  });

  it('empty transcript is wrong', () => {
    expect(gradeOralAnswer('', constitution)).toEqual({ verdict: 'wrong', matched: [], missing: ['constitution'] });
    expect(gradeOralAnswer('   ', constitution).verdict).toBe('wrong');
  });

  it('filler-only speech is wrong', () => {
    expect(gradeOralAnswer('um, I think… uh', constitution).verdict).toBe('wrong');
  });

  it('all keywords required; half is near', () => {
    const cfg = single('keep powerful');
    expect(gradeOralAnswer('to keep him from being too powerful', cfg).verdict).toBe('correct');
    expect(gradeOralAnswer('so the president is not too powerful', cfg).verdict).toBe('near');
  });

  it('best alternative wins', () => {
    const cfg = single('self government', 'govern themselves');
    expect(gradeOralAnswer('people govern themselves', cfg).verdict).toBe('correct');
    expect(gradeOralAnswer('people rule themselves', cfg).verdict).toBe('near');
    expect(gradeOralAnswer('freedom', cfg).verdict).toBe('wrong');
  });

  it('digits never near-match', () => {
    expect(gradeOralAnswer('26', single('27')).verdict).toBe('wrong');
  });
});

describe('gradeOralAnswer — phrase', () => {
  const q60: OralAnswerConfig = {
    type: 'phrase',
    alternatives: [['powers not given federal government belong states']],
    minKeywords: 5,
    mustInclude: ['not'],
  };

  it('meets minKeywords with mustInclude', () => {
    expect(gradeOralAnswer('powers not given to the federal government belong to the states', q60).verdict).toBe('correct');
  });

  it('missing a mustInclude keyword is not correct', () => {
    expect(gradeOralAnswer('powers given to the federal government belong to the states', q60).verdict).toBe('near');
  });

  it('numbers in mustInclude separate world wars', () => {
    const q102: OralAnswerConfig = { type: 'phrase', alternatives: [['after world war 1']], minKeywords: 3, mustInclude: ['1'] };
    expect(gradeOralAnswer('after world war one', q102).verdict).toBe('correct');
    expect(gradeOralAnswer('after world war two', q102).verdict).toBe('near');
  });
});

describe('gradeOralAnswer — enumeration', () => {
  const q16: OralAnswerConfig = { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] };

  it('every part required', () => {
    expect(gradeOralAnswer('congress, the president and the courts', q16).verdict).toBe('correct');
    expect(gradeOralAnswer('congress and the president', q16).verdict).toBe('near');
  });

  it('repeating one part does not satisfy the others', () => {
    expect(gradeOralAnswer('congress congress congress', q16).verdict).toBe('wrong');
  });

  it('a word may be reused across parts, not within one', () => {
    const q81: OralAnswerConfig = {
      type: 'enumeration',
      alternatives: [['new york', 'new jersey', 'north carolina', 'south carolina', 'virginia']],
    };
    expect(gradeOralAnswer('new york new jersey virginia north and south carolina', q81).verdict).toBe('correct');
    const q48: OralAnswerConfig = { type: 'enumeration', alternatives: [['secretary education', 'secretary energy']] };
    expect(gradeOralAnswer('secretary of education and energy', q48).verdict).toBe('correct');
  });
});

describe('gradeOralAnswer — mustExclude', () => {
  const q42: OralAnswerConfig = { type: 'single', alternatives: [['president']], mustExclude: ['vice'] };

  it('blocks correct but can still be near', () => {
    expect(gradeOralAnswer('the president', q42).verdict).toBe('correct');
    expect(gradeOralAnswer('the vice president', q42).verdict).toBe('near');
  });
});

describe('gradeOralAnswer — matched / missing', () => {
  it('reports which keywords were heard', () => {
    const g = gradeOralAnswer('congress and the president', { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] });
    expect(g.matched).toEqual(['congress', 'president']);
    expect(g.missing).toEqual(['courts']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/grade-oral.test.ts`
Expected: FAIL — `Failed to resolve import "./grade-oral"`.

- [ ] **Step 3: Implement the engine**

Create `apps/website/src/lib/n400/oral/grade-oral.ts`:

```ts
// Deterministic oral-answer grader. Pure: runs identically in the browser
// (practice) and on the server (mock). Spec §3.2.

import { levenshtein } from 'edit-distance';
import { stem, transcriptStems } from './normalize';
import type { OralAnswerConfig, OralGrade, OralVerdict } from './types';

const LONG_WORD_LEN = 8;
const RANK: Record<OralVerdict, number> = { wrong: 0, near: 1, correct: 2 };

function editDistance(a: string, b: string): number {
  return levenshtein(a, b, () => 1, () => 1, (x, y) => (x === y ? 0 : 1)).distance;
}

// A near-match only ever contributes to `near` (D8): recognizers output real
// words, so "institution" for "constitution" is a different word, not a typo.
function isNearWord(token: string, keywordStem: string): boolean {
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

export function gradeOralAnswer(transcript: string, config: OralAnswerConfig): OralGrade {
  const tokens = transcriptStems(transcript);
  const mustInclude = new Set((config.mustInclude ?? []).map(stem));
  const excluded = (config.mustExclude ?? []).some((w) => tokens.includes(stem(w)));

  let best: { rank: number; hits: number; grade: OralGrade } | null = null;

  for (const parts of config.alternatives) {
    const matched: string[] = [];
    const missing: string[] = [];
    let allExact = true;
    let allLoose = true;
    let total = 0;
    let hits = 0;

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
      total += keywords.length;
      hits += looseCount;
    }

    const verdict: OralVerdict =
      allExact && !excluded ? 'correct' : allLoose || (hits > 0 && hits * 2 >= total) ? 'near' : 'wrong';
    const rank = RANK[verdict];
    if (!best || rank > best.rank || (rank === best.rank && hits > best.hits)) {
      best = { rank, hits, grade: { verdict, matched, missing } };
    }
  }

  return best?.grade ?? { verdict: 'wrong', matched: [], missing: [] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/oral/grade-oral.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/oral/grade-oral.ts src/lib/n400/oral/grade-oral.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): deterministic oral-answer grading engine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Config generator + generated file

**Files:**
- Create: `apps/website/src/lib/n400/oral/build-config.ts`
- Create: `apps/website/scripts/n400/build-oral-config.ts`
- Create (generated): `apps/website/src/lib/n400/oral/oral-answer-config.generated.ts`
- Test: `apps/website/src/lib/n400/oral/build-config.test.ts`

**Interfaces:**
- Consumes: `N400_QUESTIONS`, `N400Question` from `../questions-data`; `keywordsOf`, `NEGATIONS`, `stem` from `./normalize`; `OralAnswerConfig`, `OralAnswerType` from `./types`.
- Produces:
  - `buildOralConfig(q: N400Question): OralAnswerConfig | null` — `null` for location-based questions.
  - `buildAllOralConfigs(): Record<number, OralAnswerConfig>` — the 124 non-location questions.
  - `echoExceptionIds(): number[]` — questions where every keyword is in the question.
  - `surnameOf(name: string): string`.
  - `ORAL_ANSWER_CONFIG: Record<number, OralAnswerConfig>` exported from the generated file.

- [ ] **Step 1: Write the failing generator tests**

Create `apps/website/src/lib/n400/oral/build-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { buildAllOralConfigs, buildOralConfig, echoExceptionIds, surnameOf } from './build-config';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';

const cfg = (id: number) => buildOralConfig(N400_QUESTIONS_BY_ID.get(id)!);

describe('buildOralConfig — spec §3.1 examples', () => {
  it.each([
    [2, { type: 'single', alternatives: [['constitution']] }],
    [16, { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] }],
    [37, { type: 'single', alternatives: [['keep powerful']] }],
    [42, { type: 'single', alternatives: [['president']], mustExclude: ['vice'] }],
    [60, { type: 'phrase', alternatives: [['powers not given federal government belong states']], minKeywords: 5, mustInclude: ['not'] }],
    [102, { type: 'phrase', alternatives: [['after world war 1']], minKeywords: 3, mustInclude: ['1'] }],
    [120, { type: 'single', alternatives: [['new york']] }],
  ])('Q%i', (id, expected) => {
    expect(cfg(id)).toEqual(expected);
  });
});

describe('buildOralConfig — rules', () => {
  it('person-name questions keep the surname only', () => {
    expect(cfg(38)).toEqual({ type: 'single', alternatives: [['trump']] });
    expect(cfg(39)).toEqual({ type: 'single', alternatives: [['vance']] });
  });

  it('question-echo drops keywords already in the question', () => {
    expect(cfg(40)).toEqual({ type: 'single', alternatives: [['vice']] });
    expect(cfg(52)).toEqual({ type: 'single', alternatives: [['supreme']] });
  });

  it('enumeration needs a counted question AND matching part count', () => {
    expect(cfg(15)?.type).toBe('single'); // "three branches ... Why?" → "Checks and balances" is one idea
    expect(cfg(119)?.type).toBe('single'); // "Washington, D.C." has a comma but no count
    expect(cfg(126)).toEqual({ type: 'enumeration', alternatives: [['new year', 'thanksgiving', 'christmas']] });
  });

  it('location-based questions are resolved at runtime, not generated', () => {
    for (const id of [23, 29, 61, 62]) expect(cfg(id)).toBeNull();
  });

  it('echo exceptions are exactly Q6 and Q76 (spec §3.1)', () => {
    expect(echoExceptionIds()).toEqual([6, 76]);
  });

  it('surnameOf strips suffixes', () => {
    expect(surnameOf('Martin Luther King, Jr.')).toBe('king');
    expect(surnameOf('JD Vance')).toBe('vance');
  });
});

describe('generated file', () => {
  it('matches the generator exactly (re-run: npx tsx scripts/n400/build-oral-config.ts)', () => {
    expect(ORAL_ANSWER_CONFIG).toEqual(buildAllOralConfigs());
  });

  it('covers every non-location question', () => {
    expect(Object.keys(ORAL_ANSWER_CONFIG)).toHaveLength(124);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/build-config.test.ts`
Expected: FAIL — `Failed to resolve import "./build-config"`.

- [ ] **Step 3: Implement the generator library**

Create `apps/website/src/lib/n400/oral/build-config.ts`:

```ts
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
};

// Q42–46 — "The Vice President" contains "president" and must not pass.
const VICE: Partial<OralAnswerConfig> = { mustExclude: ['vice'] };
const EXTEND: Readonly<Record<number, Partial<OralAnswerConfig>>> = {
  42: VICE, 43: VICE, 44: VICE, 45: VICE, 46: VICE,
};

const COUNT_WORDS: Readonly<Record<string, number>> = { two: 2, three: 3, four: 4, five: 5 };
const COUNT_RE = /\b(?:name|what are)(?: the)? (two|three|four|five)\b/;
const NAME_SUFFIX_RE = /\b(?:jr|sr|ii|iii|iv)\b\.?/gi;

const isDigits = (w: string) => /^\d+$/.test(w);

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
      alternatives.push(parts.map((p) => dropEcho(keywordsOf(p)).join(' ')));
      continue;
    }
    const kws = dropEcho(keywordsOf(answer));
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
```

- [ ] **Step 4: Write the generator script**

Create `apps/website/scripts/n400/build-oral-config.ts`:

```ts
// Regenerates src/lib/n400/oral/oral-answer-config.generated.ts.
// Run from apps/website: npx tsx scripts/n400/build-oral-config.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAllOralConfigs } from '../../src/lib/n400/oral/build-config';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../src/lib/n400/oral/oral-answer-config.generated.ts');

const body =
  '// AUTO-GENERATED by scripts/n400/build-oral-config.ts — do not edit by hand.\n' +
  '// Regenerate: npx tsx scripts/n400/build-oral-config.ts (from apps/website)\n' +
  '// Spec: docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md §3.1\n\n' +
  "import type { OralAnswerConfig } from './types';\n\n" +
  `export const ORAL_ANSWER_CONFIG: Record<number, OralAnswerConfig> = ${JSON.stringify(buildAllOralConfigs(), null, 2)};\n`;

writeFileSync(out, body);
console.log(`wrote ${out}`);
```

- [ ] **Step 5: Generate the file**

Run: `npx tsx scripts/n400/build-oral-config.ts`
Expected: `wrote …/oral-answer-config.generated.ts`. Open the file and spot-check Q2 → `[["constitution"]]`, Q16 → enumeration with three parts, Q66 → `[["united states"]]`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/oral/build-config.test.ts`
Expected: PASS. If `echoExceptionIds()` returns anything other than `[6, 76]`, or any §3.1 example differs, **stop and report** — do not edit the test or the rules (D10).

- [ ] **Step 7: Commit**

```bash
git add src/lib/n400/oral/build-config.ts src/lib/n400/oral/build-config.test.ts src/lib/n400/oral/oral-answer-config.generated.ts scripts/n400/build-oral-config.ts
git commit -m "$(cat <<'EOF'
feat(n400app): generate reviewed oral-answer config for all Civics questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Aliases + config resolver (incl. location-based questions)

**Files:**
- Create: `apps/website/src/lib/n400/oral/oral-aliases.ts`
- Create: `apps/website/src/lib/n400/oral/get-oral-config.ts`
- Test: `apps/website/src/lib/n400/oral/get-oral-config.test.ts`

**Interfaces:**
- Consumes: `ORAL_ANSWER_CONFIG` (Task 4), `surnameOf` (Task 4), `keywordsOf` (Task 2), `N400_QUESTIONS_BY_ID` from `../questions-data`, `correctAnswersFor` from `../quiz-engine`, `StateCode` from `../state-data`.
- Produces:
  - `ORAL_ALIASES: Readonly<Record<number, string[][]>>`.
  - `interface OralLocation { stateCode: StateCode; districtNumber: number | null }`.
  - `getOralAnswerConfig(qid: number, location?: OralLocation): OralAnswerConfig | null` — Slice 2 (practice) and Slice 3 (server finalize) call this.

- [ ] **Step 1: Write the failing resolver tests**

Create `apps/website/src/lib/n400/oral/get-oral-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import { gradeOralAnswer } from './grade-oral';
import { getOralAnswerConfig } from './get-oral-config';
import { ORAL_ALIASES } from './oral-aliases';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';

const TX = { stateCode: 'TX' as const, districtNumber: null };

describe('getOralAnswerConfig', () => {
  it('returns the generated config plus aliases', () => {
    expect(getOralAnswerConfig(4)).toEqual({
      type: 'single',
      alternatives: [['self government'], ['govern themselves']],
    });
  });

  it('returns null for unknown questions', () => {
    expect(getOralAnswerConfig(999)).toBeNull();
  });

  it('location-based questions need a location', () => {
    expect(getOralAnswerConfig(23)).toBeNull();
  });

  it.each([23, 29, 61, 62])('Q%i: every personal answer for TX grades correct', (id) => {
    const q = N400_QUESTIONS_BY_ID.get(id)!;
    const config = getOralAnswerConfig(id, TX);
    expect(config).not.toBeNull();
    for (const a of correctAnswersFor(q, TX.stateCode, TX.districtNumber)) {
      expect(gradeOralAnswer(a.en, config!).verdict).toBe('correct');
    }
  });

  it('senators and governors accept the surname alone', () => {
    expect(gradeOralAnswer('Cruz', getOralAnswerConfig(23, TX)!).verdict).toBe('correct');
    expect(gradeOralAnswer('Abbott', getOralAnswerConfig(61, TX)!).verdict).toBe('correct');
  });
});

describe('ORAL_ALIASES', () => {
  it('each alias grades correct as spoken', () => {
    for (const [qid, alts] of Object.entries(ORAL_ALIASES)) {
      for (const parts of alts) {
        expect(gradeOralAnswer(parts.join(' '), getOralAnswerConfig(Number(qid))!).verdict).toBe('correct');
      }
    }
  });

  it('no alias duplicates a generated alternative', () => {
    for (const [qid, alts] of Object.entries(ORAL_ALIASES)) {
      const generated = ORAL_ANSWER_CONFIG[Number(qid)].alternatives.map((a) => a.join('|'));
      for (const parts of alts) expect(generated).not.toContain(parts.join('|'));
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/n400/oral/get-oral-config.test.ts`
Expected: FAIL — `Failed to resolve import "./get-oral-config"`.

- [ ] **Step 3: Write the alias file**

Create `apps/website/src/lib/n400/oral/oral-aliases.ts`:

```ts
// Hand-written equivalent phrasings, graded as exact accepted answers (spec §3.1).
// Every entry needs a one-line reason and is covered by get-oral-config.test.ts.
// Keep aliases narrow: the taught answer's wording, never free paraphrase, and
// never added just to turn a `near` into `correct`. Changes are spec changes (D10).

export const ORAL_ALIASES: Readonly<Record<number, string[][]>> = {
  // Q4 — "self-government" is commonly explained as "people govern themselves"; `people` dropped by question-echo.
  4: [['govern themselves']],
};
```

- [ ] **Step 4: Implement the resolver**

Create `apps/website/src/lib/n400/oral/get-oral-config.ts`:

```ts
// Resolves the OralAnswerConfig for one question: generated config + aliases,
// or — for location-based questions — the learner's personal answers.

import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { correctAnswersFor } from '../quiz-engine';
import type { StateCode } from '../state-data';
import { surnameOf } from './build-config';
import { keywordsOf } from './normalize';
import { ORAL_ALIASES } from './oral-aliases';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';
import type { OralAnswerConfig } from './types';

export interface OralLocation {
  stateCode: StateCode;
  districtNumber: number | null;
}

const PERSON_LOCATION_IDS: ReadonlySet<number> = new Set([23, 29, 61]);

export function getOralAnswerConfig(qid: number, location?: OralLocation): OralAnswerConfig | null {
  const q = N400_QUESTIONS_BY_ID.get(qid);
  if (!q) return null;

  if (q.isLocationBased) {
    if (!location) return null;
    const answers = correctAnswersFor(q, location.stateCode, location.districtNumber);
    if (answers.length === 0) return null;
    const alternatives = answers
      .map((a) => (PERSON_LOCATION_IDS.has(qid) ? surnameOf(a.en) : keywordsOf(a.en).join(' ')))
      .filter(Boolean)
      .map((k) => [k]);
    return alternatives.length > 0 ? { type: 'single', alternatives } : null;
  }

  const generated = ORAL_ANSWER_CONFIG[qid];
  if (!generated) return null;
  const aliases = ORAL_ALIASES[qid];
  return aliases ? { ...generated, alternatives: [...generated.alternatives, ...aliases] } : generated;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/n400/oral/get-oral-config.test.ts`
Expected: PASS. If a Texas representative's name yields an empty surname (e.g. an unusual suffix), **stop and report** with the name.

- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/oral-aliases.ts src/lib/n400/oral/get-oral-config.ts src/lib/n400/oral/get-oral-config.test.ts
git commit -m "$(cat <<'EOF'
feat(n400app): oral-answer aliases and per-learner config resolver

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Corpus tests — reference table, echo, cross-question matrix

**Files:**
- Test: `apps/website/src/lib/n400/oral/grade-oral.corpus.test.ts`

**Interfaces:**
- Consumes: `gradeOralAnswer` (Task 3), `getOralAnswerConfig` (Task 5), `keywordsOf` (Task 2), `N400_QUESTIONS` from `../questions-data`.
- Produces: the regression firewall that pins grading behavior across all 128 questions.

- [ ] **Step 1: Write the corpus tests**

Create `apps/website/src/lib/n400/oral/grade-oral.corpus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS } from '../questions-data';
import { gradeOralAnswer } from './grade-oral';
import { getOralAnswerConfig } from './get-oral-config';
import { keywordsOf } from './normalize';
import type { OralVerdict } from './types';

const graded = N400_QUESTIONS.filter((q) => !q.isLocationBased);
const verdict = (qid: number, said: string) => gradeOralAnswer(said, getOralAnswerConfig(qid)!).verdict;

describe('spec §3.3 reference table', () => {
  it.each<[number, string, OralVerdict]>([
    [2, 'the constitution', 'correct'],
    [2, 'constitution constitution constitution', 'correct'],
    [2, 'the institution', 'near'],
    [7, '27 amendments', 'correct'],
    [20, 'I think the president writes laws', 'correct'],
    [37, 'to keep him from being too powerful', 'correct'],
    [37, 'so the president is not too powerful', 'near'],
    [38, 'trump', 'correct'],
    [16, 'congress and the president', 'near'],
    [16, 'congress congress congress', 'wrong'],
    [4, 'people govern themselves', 'correct'],
    [4, 'people rule themselves', 'near'],
    [4, 'freedom', 'wrong'],
    [60, 'powers not given to the federal government belong to the states', 'correct'],
    [102, 'after world war two', 'near'],
    [42, 'the vice president', 'near'],
    [81, 'new york new jersey virginia north and south carolina', 'correct'],
  ])('Q%i "%s" → %s', (qid, said, expected) => {
    expect(verdict(qid, said)).toBe(expected);
  });

  it('Q60 without "not" is never correct', () => {
    expect(verdict(60, 'powers given to the federal government belong to the states')).not.toBe('correct');
  });
});

describe('every taught answer', () => {
  it.each(graded.map((q) => [q.id, q.answersEn[0]] as const))('Q%i "%s" grades correct', (qid, answer) => {
    expect(verdict(qid, answer)).toBe('correct');
  });
});

describe('real-word substitutions never grade correct (D8)', () => {
  it.each<[number, string]>([
    [2, 'the institution'],
    [1, 'republican'],
    [19, 'senator and house of representatives'],
  ])('Q%i "%s"', (qid, said) => {
    expect(verdict(qid, said)).not.toBe('correct');
  });
});

describe('question echo', () => {
  const ECHO_EXCEPTIONS = [6, 76]; // spec §3.1 — every keyword is in the question

  it('reading the question aloud is never correct, except the pinned exceptions', () => {
    const passing = graded.filter((q) => verdict(q.id, q.questionEn) === 'correct').map((q) => q.id);
    expect(passing).toEqual(ECHO_EXCEPTIONS);
  });
});

describe('cross-question matrix', () => {
  // "Q_a->Q_b": Q_a's taught answer grades `correct` for Q_b. Identical answers excluded.
  // PROVISIONAL until the owner signs off Gate 1; each pair is listed in the gate report.
  const ALLOWED_OVERLAPS = [
    '8->35', '16->18', '16->42', '16->43', '16->44', '16->45', '16->46', '25->27',
    '31->63', '31->64', '31->122', '32->63', '32->64', '32->122', '33->63', '33->64',
    '34->63', '34->64', '37->42', '37->43', '37->44', '37->45', '37->46', '47->42',
    '47->43', '47->44', '47->45', '47->46', '49->42', '49->43', '49->44', '49->45',
    '49->46', '60->122', '63->64', '63->70', '64->63', '65->6', '65->73', '66->122',
    '67->66', '67->122', '69->70', '79->36', '81->120', '84->2', '84->35', '84->82',
    '87->9', '87->11', '87->14', '87->80', '88->2', '88->82', '97->5', '98->91',
    '98->92', '98->96', '107->27', '110->109', '111->109', '113->6', '113->91', '113->92',
    '113->96', '115->66', '115->122', '128->35',
  ];

  it('matches the reviewed allowlist exactly', () => {
    const same = (a: string, b: string) => keywordsOf(a).join(' ') === keywordsOf(b).join(' ');
    const overlaps: string[] = [];
    for (const a of graded) {
      for (const b of graded) {
        if (a.id === b.id || same(a.answersEn[0], b.answersEn[0])) continue;
        if (verdict(b.id, a.answersEn[0]) === 'correct') overlaps.push(`${a.id}->${b.id}`);
      }
    }
    expect(overlaps).toEqual(ALLOWED_OVERLAPS);
  });
});
```

- [ ] **Step 2: Run the corpus tests**

Run: `npx vitest run src/lib/n400/oral/grade-oral.corpus.test.ts`
Expected: PASS. The allowlist was computed by a prototype of this exact algorithm on 2026-09-24. If the actual overlap list differs, **stop and report the diff** — do not edit the allowlist to make it pass (D10).

- [ ] **Step 3: Run the full gate**

Run: `npm run type-check && npm run test && npm run build`
Expected: all three succeed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/n400/oral/grade-oral.corpus.test.ts
git commit -m "$(cat <<'EOF'
test(n400app): pin oral grading across all 128 Civics questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Gate 1 report

**Files:**
- Create: `docs/superpowers/spikes/2026-09-24-n400-oral-grading-gate1.md`

**Interfaces:**
- Consumes: the generated config (Task 4) and the corpus test output (Task 6).
- Produces: the owner's sign-off, which unlocks the Slice 2 plan.

- [ ] **Step 1: Write the gate report**

Create `docs/superpowers/spikes/2026-09-24-n400-oral-grading-gate1.md`:

```markdown
# N400 Oral Grading — Gate 1 Review

**Branch:** feat/n400-oral-grading
**Spec:** docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md (rev 3.1)

## 1. Generated config

Review `apps/website/src/lib/n400/oral/oral-answer-config.generated.ts` (124 questions). For each question, the keywords must be what an officer would need to hear.

## 2. Cross-question overlaps flagged for a decision

Most of the 68 pinned pairs are harmless supersets (e.g. "After the Civil War" contains "Civil War"). These need an explicit owner decision:

| Pair(s) | What happens | Options |
|---|---|---|
| 16→18, 16→42–46 | Listing all three branches ("Congress, president, and the courts") passes "Which part writes laws?" / "Who is Commander in Chief?" | accept as-is · add `mustExclude` (e.g. Q18 `['president','courts']`) |
| 8→35, 84→35, 128→35 | Q35 config is only `people` (echo dropped "more"), so any answer containing "people" passes "Why do some states have more representatives?" | accept · override Q35 to `more people` |
| 25→27, 79→36, 107→27 | A number inside a longer answer ("Two years", "July 4 1776") passes a bare-number question | accept (unlikely in practice) · no cheap fix |
| 84→2/82, 88→2/82 | "Father of the Constitution" passes "What is the supreme law?" | accept · add `mustExclude: ['father']` |
| 97→5 | "14th Amendment" passes "How are changes made to the Constitution?" | accept (contains "amendment") |

## 3. Echo exceptions

Q6 ("Rights of Americans" → `rights`) and Q76 ("War for American Independence" → `war independence`) pass when the question is read aloud. Accept or override?

## 4. Proposed aliases

Only Q4 exists today. List candidate phrasings you hear in real use; each becomes a spec change + test.

## Decision (owner)

- Generated config approved? <yes/no + questions to change>
- Overlap decisions: <per row>
- Gate 1 pass? <yes/no>
```

- [ ] **Step 2: Commit the report**

```bash
git add ../../docs/superpowers/spikes/2026-09-24-n400-oral-grading-gate1.md
git commit -m "$(cat <<'EOF'
docs(n400app): oral grading Gate 1 review report

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: GATE 1 — stop and hand off to the owner**

Do not merge and do not start Slice 2. Every owner decision that changes a rule, override, alias or the allowlist goes back through the spec (D10), then into `build-config.ts` / `oral-aliases.ts`, a regenerated file, and updated tests. After sign-off, the Slice 2–4 plan is written from the spike results and this branch is merged via `superpowers:finishing-a-development-branch`.
