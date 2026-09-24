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

## 5. Real device transcripts from the Gate 0 spike (informational)

Final transcripts captured on iPhone Safari / desktop Chrome, run through the finished engine:

| Q | Heard | Verdict |
|---|---|---|
| 2 | "The constitution" | correct |
| 7 | "27" (both Safari and Chrome return digits) | correct |
| 15 | "Checks and balances" / "check **Zen** balances" | correct / correct |
| 16 | "Congress president**s** and the courts" | correct |
| 65 | "freedom of speech" / "Freedom speech" | near / near (Q65 asks for **three** rights; one given) |
| 65 | "**videos** of speech" | wrong (recognizer error; Slice 2 echo + retry covers it) |

Recognizer noise ("Zen", plural "presidents", dropped "of") does not flip a correct answer. Cosmetic: in Q65, `matched` lists "freedom" twice because the word is reused across parts. This matters only if Slice 2 displays `matched`.

## Decision (owner)

- Generated config approved? <yes/no + questions to change>
- Overlap decisions: <per row>
- Gate 1 pass? <yes/no>
