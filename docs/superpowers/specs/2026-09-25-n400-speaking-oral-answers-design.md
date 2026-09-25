# N400 Speaking + Full-Interview Oral Answers — Design

**Date:** 2026-09-25 (rev 1.0 — brainstorm with the owner, design sections 1–5 approved)
**App:** `apps/website/` (N400Ready, `/n400ready`)
**Builds on:** `docs/superpowers/specs/2026-09-24-n400-civics-oral-answers-design.md` (rev 3.16), called "the Civics spec" below. Everything there applies here unless this spec says otherwise:
- Web Speech API; the iOS persistent session (D15); 🔊 through Web Audio while a session runs.
- Stall phrases; the typed fallback after 4 silent tries; the in-app typed box (D12).
- Near-confirm is never recorded (D7); a near-match only gives `near` (D8); grading is spec-governed (D10).

## 1. Goal

Learners can answer every spoken part of the interview by voice, the way the real interview works:

- **Study:** the Speaking practice modes **What-mean** ("What does *X* mean?") and **Yes/No** get the Civics switch **[Trắc nghiệm | Tự nói]**.
- **Thi thử Speaking** can be taken by voice.
- **Phỏng vấn đầy đủ:** one choice at the start, **Trắc nghiệm** or **Toàn bộ bằng giọng**, covers the Civics part (20) and the Speaking part (10). Writing stays typed dictation.

**Success:**
- Voice answers are graded fairly and count exactly like multiple-choice answers.
- The owner passes each gate on a device.
- One flag, `voice_speaking`, switches all of this off without touching Civics voice.

**Out of scope:**
- Writing by voice.
- Storing Speaking transcripts.
- Server-side grading for Speaking or the Full interview.
- Android, which stays behind `voice_android`.
- Waiting while a learner is still thinking: a lone stall still grades wrong in practice.

## 2. Decisions

| ID | Decision |
|---|---|
| S1 | **What-mean is graded by keywords** against the definition the app teaches, plus an **owner-reviewed synonym list per term** (owner, 2026-09-25). No LLM. Same engine as Civics (`gradeOralAnswer`). |
| S2 | **Yes/No is graded by an intent classifier**: `yes` / `no` / `unclear`, checked against `YesNoQuestion.answer` (all 37 are `no` today). Stall phrases are checked first, so "I don't know" is `unclear`, never `no`. `unclear` is never graded: ask again. In mocks it never consumes the retry. |
| S3 | **One shared grader**, `gradeSpokenItem`, dispatches civics / what-mean / yes-no by item. All three grade **on the client**, like practice and the Full interview already do. The standalone Civics voice mock keeps its server finalize, unchanged. |
| S4 | **Voice lives in the shared components** (approach A, owner): `SectionMCQuiz` (What-mean practice; both Full interview parts) and `SectionYesNoQuiz` (Yes/No practice) reuse `AnswerModeToggle` + `MicAnswerPanel` exactly. Speaking must match the Civics UI. The Speaking mock page gets the Civics-mock voice branch. |
| S5 | **Stall protection:** a stall phrase is never dropped when every one of its words is a keyword of the item being graded. What-mean #61's definition is "Right now / Where you live now". This applies to Civics too; no Civics answer changes, and a test pins that. |
| S6 | **New flag `voice_speaking`**, seeded OFF, is the kill switch for everything in this spec. Civics voice flags are unchanged; Android still needs `voice_android`. |
| S7 | **Migration `n400_34`** adds `answer_mode` to `n400_section_attempts` and `n400_section_mock_results` and seeds the flag. No Speaking transcripts are stored. The Full interview Civics part stores transcripts in `n400_question_attempts`, like the Civics voice mock. |
| S8 | **Practice always opens in Trắc nghiệm** (Civics rev 3.13). The choice in the Speaking mock and the Full interview is remembered per surface (localStorage, try/catch), like the Civics mock. |

## 3. Grading

### 3.1 What-mean config: generated plus synonyms

- **Generated:** `lib/n400/oral/whatmean-oral-config.generated.ts`, built from `whatmean-data.ts` (62 terms) by `buildWhatMeanOralConfig` in `lib/n400/oral/build-whatmean-config.ts`. The generator mirrors `build-config.ts`:
  - keywords come from `keywordsOf(definitionEn)`;
  - an "or" list (`A knife or a gun`, `Husband or wife`, `Nursing, cooking, or translation`) becomes alternatives, any one of which is enough;
  - 4 or more keywords makes a `phrase` with `minKeywords = ⌈2k/3⌉`; otherwise every keyword is required;
  - negations (`not`, `no`, `never`, `without`) and digits go into `mustInclude`. "Someone who is **not** a U.S. citizen" needs "not".
  - **No echo-drop.** The term's words stay as keywords. Echo is controlled by a test instead: reading the term aloud never grades `correct` for its own item.
- **Synonyms and overrides:** `lib/n400/oral/whatmean-oral-aliases.ts` is hand-written and owner-reviewed at Gate S1. It holds extra alternatives per term (e.g. #1 "tell … citizen", #7 "take down … government … violence") and `REPLACE` entries where the generated config is wrong.
- **Lookup:** `getWhatMeanOralConfig(id: string): OralAnswerConfig | null` merges generated plus aliases.
- **Tests:**
  - every `definitionEn` grades `correct` against its own config;
  - the term text never grades `correct` for its own item;
  - **cross-term matrix:** the set of (definition of A → `correct` for B) pairs equals a pinned allowlist the owner reviews at Gate S1;
  - each alias grades `correct`, and no alias duplicates a generated alternative;
  - stall and not-knowing sweep (as Civics rev 3.15/3.16): never better than `wrong` on any What-mean config;
  - generator determinism: re-running reproduces the generated file exactly.

### 3.2 Yes/No intent

`lib/n400/oral/yes-no-intent.ts`:

```ts
export type YesNoIntent = 'yes' | 'no' | 'unclear';
export function classifyYesNo(transcript: string): YesNoIntent;
export function gradeYesNo(transcript: string, expected: 'yes' | 'no'): 'correct' | 'wrong' | 'unclear';
```

The classifier normalizes with `normalizeTokens(text)` **without** `dropStalls`. The generic `STALL_PHRASES` list drops "yes", "yeah" and "okay", so it must never run here. The classifier keeps its own not-knowing list.

Classification, in order:
1. A not-knowing or asking-again stall anywhere ("I don't know", "not sure", "I don't remember", "say again", "repeat", "what was the question"…) → `unclear`.
2. **Negative forms:** `no`, `nope`, `nah`, `never`, and `not` (covers "I have not", "I did not", "I am not", "I do not", "I have never been") → a `no` marker.
3. **Affirmative forms:** `yes`, `yeah`, `yep`, `yup`, `correct`, `sure`, `of course`, "I have", "I did", "I do", "I am", "I was" → a `yes` marker. These count only when they are not part of a negative form, so "I have not" is only `no`.
4. Exactly one side present → that side. Both or neither → `unclear`.

Tests: a phrase table of at least 40 rows, including:
- `no`: "No", "No, officer", "No sir", "Nope", "Never", "No, never", "I have never been", "I have not been arrested", "I am not".
- `yes`: "Yes", "Yeah I have", "I did".
- `unclear`: "I don't know", "not sure", "Yes no", "", "Say again".

### 3.3 Shared grader

`lib/n400/oral/grade-spoken-item.ts`:

```ts
export type SpokenItem =
  | { kind: 'civics'; qid: number }
  | { kind: 'whatmean'; id: string }   // "wm-<n>"
  | { kind: 'yesno'; id: string };     // "yn-<n>"
export function spokenItemFromId(itemId: string): SpokenItem | null; // "civ-12" | "wm-3" | "yn-7"
export function canSpeak(item: SpokenItem, location: OralLocation): boolean; // has a grading config
export interface SpokenGrade { verdict: 'correct' | 'near' | 'wrong' | 'unclear'; nearAnswer: string | null }
export function gradeSpokenItem(item: SpokenItem, transcript: string, location: OralLocation): SpokenGrade;
```

- `civics` uses `getOralAnswerConfig(qid, location)` and `nearPromptAnswer`, both existing.
- `whatmean` uses §3.1; `nearAnswer` = the taught definition.
- `yesno` uses §3.2 and is never `near`.
- `canSpeak` is false for a location-based Civics question without answers. That item stays multiple choice inside a voice run, as in the Civics voice mock.

### 3.4 Stall protection (S5)

- `transcriptStems(text, { keep })` keeps a stall phrase only when **every** one of its words (stopwords aside) is in `keep`. One shared word is not enough: "one more time" stays dropped for Civics Q35 (`more people`), keeping the rev 3.16 fix (S1 prototyping).
- `gradeOralAnswer` passes its config's keyword stems.
- Tests:
  - What-mean #61 "right now" grades `correct`;
  - the Civics stall sweep and the "stall removal never touches a taught answer" test stay green.

## 4. Practice flows (Học tập)

- **Where the switch lives:** the practice session screen, not the hub, gets **[Trắc nghiệm | Tự nói]**, identical to Civics.
  - Each visit starts in Trắc nghiệm (S8).
  - Hubs and flashcards are unchanged, so the no-scroll hub rule holds.
  - The switch is hidden when `voice_speaking` is off or the browser has no speech API.
  - In-app browsers get the typed box (D12).
  - After 4 silent tries the rest of the session uses the typed box (Civics rev 3.11).
- **What-mean, Tự nói:**
  - The term shows with 🔊 (the question audio) above the Civics `MicAnswerPanel`.
  - Correct or wrong: the existing feedback (the taught definition plus 🔊), plus one line, "Bạn nói: …".
  - Near: "Có phải bạn nói: *<definition>*?" with [Đúng vậy] / [Không]. Đúng vậy shows correct but is **not recorded** (D7).
- **Yes/No, Tự nói:**
  - `MicAnswerPanel` replaces [Yes, officer] / [No, officer].
  - `unclear`: "Bạn trả lời Yes hay No? Hãy nói lại." Nothing is recorded, and the mic stays ready.
  - Correct or wrong: the existing feedback plus "Bạn nói: …".
- **Recording:**
  - A voice answer calls `recordSectionAnswer(section, itemId, correct, 'practice', 'voice' | 'typed')`, so it counts for "thuộc", review debt, streak and badges exactly like a choice answer.
  - The `answer_mode` column comes from §6.
- **iOS:**
  - Every 🔊 in these screens passes `onBeforePlay={mic.noteAudioPlayed}` and `preferWebAudio={mic.sessionRunning}`, like Civics.
  - The shared `VoiceMicProvider` session carries across items.

## 5. Mock flows

### 5.1 Thi thử Speaking (10 items: 5 What-mean + 5 Yes/No, pass ≥ 8)

- **New intro stage** with "Cách trả lời: [Trắc nghiệm | Trả lời bằng giọng]". It is shown **only when voice is available** (flag + support). Otherwise the test starts directly, as today (same rule as Civics rev 3.14).
- **Voice run, per item:**
  1. 🔊 plays the question.
  2. The learner speaks.
  3. "App nghe được: …" appears.
  4. [Đúng vậy] locks the answer; [Nói lại] is allowed once (`MicAnswerPanel` variant `mock`).
- **No verdict mid-test.** A Yes/No `unclear` re-asks "Bạn trả lời Yes hay No?". Neither that nor a mic error (no-speech, network, unavailable) consumes the retry.
- **Grading at finish:** `gradeSpokenItem` per item; `near` counts as wrong (D8).
- **Result rows:** "Bạn nói: …" plus the accepted answer.
- **Recording:** `recordSectionMockResult('speaking', passed, score, 10, 'voice' | 'typed')`.
- **Mic trouble:** if the mic is lost mid-test, the remaining items are typed. In-app browsers type from the start.

### 5.2 Phỏng vấn đầy đủ

- **Intro:** "Cách trả lời: [Trắc nghiệm | Toàn bộ bằng giọng]". This one choice covers the Civics part and the Speaking part; the Writing part is unchanged.
- **Voice run:** both parts use `SectionMCQuiz` in exam mode with the §5.1 voice item behaviour.
  - Items where `canSpeak` is false stay multiple choice.
  - Each part is graded when it completes.
- **Recording, Civics part:** `recordMockResult` gains `answerMode` and a per-question `transcript`. These write `n400_quiz_attempts.answer_mode` and `n400_question_attempts.transcript`, which exist since `n400_32`/`n400_33`. The plan verifies the RLS insert policy allows both columns.
- **Recording, Speaking part:** `recordSectionMockResult('speaking', …, 'voice' | 'typed')`.
- **Review screen:** a voice row shows "Bạn nói: …" instead of the picked option.
- **Unchanged:** interludes, the stepper and the pass rules (12/20, 8/10, 1/3).
- **Mic trouble:** if the mic is lost, the remaining voice items are typed. The run never falls back to multiple choice.

## 6. Data: migration `supabase/migrations/n400_34_speaking_voice.sql`

```sql
ALTER TABLE public.n400_section_attempts
  ADD COLUMN answer_mode TEXT NOT NULL DEFAULT 'choice'
  CHECK (answer_mode IN ('choice', 'voice', 'typed'));
ALTER TABLE public.n400_section_mock_results
  ADD COLUMN answer_mode TEXT NOT NULL DEFAULT 'choice'
  CHECK (answer_mode IN ('choice', 'voice', 'typed'));
INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, description)
VALUES ('voice_speaking', FALSE, 100, 'Speaking (What-mean, Yes/No) + Full interview voice answers')
ON CONFLICT (flag_key) DO NOTHING;
```

- **Backward compatible:** the columns default, so existing inserts don't change.
- **Apply:** with the MCP `apply_migration` after the owner approves (shared Supabase project).
- **Verify:** the existing rolled-back DO-block pattern.

## 7. Flags

- `useVoiceFlags` gains `speakingOn` (`voice_speaking`).
- Every surface in this spec requires `speakingOn`, plus `androidOn` on Android.
- Seeded OFF. The owner turns it on for their accounts at Gate S2 and to 100% after Gate S4.

## 8. Analytics

`n400_oral_answer` (Civics spec §9, rev 3.15) gains:
- `section`: `civics | whatmean | yesno`. `qid` stays numeric (`wm-12` → 12).
- `context`: adds `full` for the Full interview.
- `verdict`: adds `unclear` (Yes/No).

The builders live in `lib/n400/oral/oral-events.ts`. It stays GA4-only, with no transcript text. The owner registers `section` as a GA4 custom dimension.

## 9. Privacy Policy §8 (ships in Slice S4, before 100%)

The owner approves this wording at spec review.

- EN: "N400Ready lets you answer **civics and interview** questions by voice." VI: "N400Ready cho phép bạn trả lời câu hỏi công dân **và câu hỏi phỏng vấn** bằng giọng nói."
- EN: "For **Civics** mock tests, N400Ready stores the text of each answer…" VI: "Với bài thi thử **Civics**, N400Ready lưu phần văn bản…". Speaking mocks store no answer text (S7).

## 10. Errors

The Civics spec §8 table applies unchanged, with one new row:

| Case | Learner sees | Mock retry consumed? |
|---|---|---|
| Yes/No `unclear` | "Bạn trả lời Yes hay No? Hãy nói lại." Nothing recorded | No |

## 11. Testing

- **Unit (vitest, node):** everything in §3; the `oral-events` builders with `section`; stall protection.
- **Source-reading wiring tests** (repo convention; vitest has no DOM):
  - voice UI renders only with `speakingOn` plus support;
  - voice answers record with `answer_mode`;
  - D7: a confirmed near is not recorded;
  - `unclear` is not recorded;
  - the Full interview writes `answerMode` and transcripts;
  - every 🔊 on these screens has the iOS wiring.
- **Gate command:** `npm run type-check`, `npm run test`, `npm run build`, run separately. `mobile-layout.test.ts` is a known pre-existing failure.
- **Manual, per gate:**
  - iPhone Safari: the session persists across items, 🔊 works with the mic on, app switch;
  - Mac Chrome;
  - Facebook in-app browser (typed).

## 12. Slices and gates

- **S1, Grading (no UI):** §3 and §3.4.
  - **Gate S1:** the owner reviews `docs/superpowers/spikes/2026-09-25-n400-speaking-grading-gate1.md`: the 62-term table (keywords, synonyms, sample phrasings with verdicts), the cross-term allowlist, and the Yes/No phrase table.
- **S2, Practice:** §4, migration `n400_34` (the owner approves before apply), `useVoiceFlags.speakingOn`, analytics `section`.
  - **Gate S2:** device pass with `voice_speaking` ON for the owner.
- **S3, Thi thử Speaking:** §5.1.
  - **Gate S3:** device pass.
- **S4, Full interview:** §5.2 and the Privacy §8 edits.
  - **Gate S4:** device pass, then `voice_speaking` goes to 100% and the ROADMAP entry is added.

Each slice has its own plan, written after the previous gate passes (S1's plan comes first).

## 13. Post-launch measurement

Weekly:
- voice vs choice correct-rate per section (`answer_mode` in the section tables and `n400_quiz_attempts`);
- the Yes/No `unclear` rate and the What-mean near-confirm rate (from `n400_oral_answer`);
- a hand-labelled sample of What-mean spoken answers from practice. There are no stored transcripts, so this sample comes from the owner's own test sessions.
