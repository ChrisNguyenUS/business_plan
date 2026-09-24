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

### Spec-level findings from the final code review (need a decision)

The code follows spec rev 3.1 in each case. Changing any of these is a spec change (D10).

| # | What happens | Options |
|---|---|---|
| R1 | **Q102 direction word is optional.** Config `after world war 1`, min 3, mustInclude `1`. "**before** world war one" and "world war one" both grade `correct`. Q104 "**before** the stock market crash of 1929" → `correct`. | accept · override Q102 `mustInclude: ['after','1']` (and Q104 `['before'…]` check) |
| R2 | **Partial list: `near` depends on word counts, not items named.** One item from a list: Q19 "senate" → wrong, Q67 "loyal" → wrong, Q69 "vote" → wrong, but Q10 "liberty" → near, Q65 "freedom speech" → near, Q48 "secretary" (no department) → near. §3.2 rule 7 (half the keywords) contradicts §11 ("partial enumerations grade `near`"). A `near` offers "Có phải bạn nói <full answer>?", so "secretary" gets offered the full answer. | pick one rule, e.g. near = ≥ half the **parts** fully matched, with each keyword counted once across parts, then align §3.2 and §11 |
| R3 | **Duration unit required inconsistently.** Q22 `6 years` and Q25 `2 years` need "years" ("six" → near), but Q36 "four" → correct (the question contains "years", so echo drops it). An officer accepts "six". | accept · generator rule: unit word optional after a number · override Q22/Q25 |

## 3. Echo exceptions

Q6 ("Rights of Americans" → `rights`) and Q76 ("War for American Independence" → `war independence`) pass when the question is read aloud. Accept or override?

## 4. Proposed aliases

Only Q4 exists today. List candidate phrasings you hear in real use; each becomes a spec change + test.

## 5. Real device transcripts from the Gate 0 spike (informational)

Final transcripts captured on iPhone Safari / desktop Chrome, run through the finished engine:

| Q | Heard | Verdict |
|---|---|---|
| 2 | "The constitution" | correct |
| 7 | "27" (both Safari and Chrome return digits) | correct |
| 15 | "Checks and balances" / "check **Zen** balances" | correct / correct |
| 16 | "Congress president**s** and the courts" | correct |
| 65 | "freedom of speech" / "Freedom speech" | wrong / wrong (rev 3.2: Q65 asks for **three** rights; 1 of 3 is under half) |
| 65 | "**videos** of speech" | wrong (recognizer error; Slice 2 echo + retry covers it) |

Recognizer noise ("Zen", plural "presidents", dropped "of") does not flip a correct answer. Cosmetic: in Q65, `matched` lists "freedom" twice because the word is reused across parts. This matters only if Slice 2 displays `matched`.

## Decision (owner)

- Generated config approved? <yes/no + questions to change>
- Overlap decisions (owner, 2026-09-24): fix the cheap ones, accept the rest.
  - 16→18, 16→42–46: **fixed**. Q18 excludes `president`/`courts`; Q42–46 exclude `vice`/`congress`/`courts`.
  - 8→35, 84→35, 128→35: **fixed**. Q35 is now `more people`.
  - 88→2/82: **fixed**. Q2/Q82 exclude `father`.
  - 84→2/82 ("helped people understand the Constitution"): **accepted**. Not covered by the `father` fix.
  - 25→27, 79→36, 107→27, 97→5 and other supersets: **accepted**.
  - New after R3: 27→25 ("Two"), 107→25 ("World War II" → 2). **Accepted** as the same kind as 25→27.
  - Allowlist: 68 → 59 pairs.
- Review findings (owner, 2026-09-24):
  - R1: Q102 requires `after`.
  - R2: enumeration `near` needs at least half the items named.
  - R3: unit word optional after a number.
- Echo exceptions Q6/Q76: kept, as the spec already accepts them.
- Spec: rev 3.2 (commit 0f78eb94). Code: 29f89309, d7009503.
- Gate 1 pass? <yes/no>
