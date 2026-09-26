# N400 Speaking Oral Answers — Gate S2 (practice device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §4 · **Plan:** docs/superpowers/plans/2026-09-25-n400-speaking-oral-s2-practice.md
**Prereqs:** migration n400_34 applied; S2 deployed; `voice_speaking` enabled for the tester (owner approval).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Học tập → What-mean → Luyện tập opens in **Trắc nghiệm**; switch to **Tự nói**; answer 5 terms by voice. A correct answer shows correct + "Bạn nói: …"; a partial answer shows "Có phải bạn nói …?"; a wrong one shows the taught definition | |
| 2 | iPhone Safari | Tự nói stays on for the next terms. After the summary, **Làm lại** and **Ôn câu sai** start at question 1 in **Trắc nghiệm** | |
| 3 | iPhone Safari | 🔊 with Tự nói on: the question plays and the next mic tap still hears you. App switch and back: you can still speak | |
| 4 | iPhone Safari | Yes/No → Tự nói: "No, officer" is correct. "I don't know" shows "Bạn trả lời Yes hay No? Hãy nói lại." and the item stays open; then "No" grades it. The slow 🔊 is hidden in Tự nói, and stays hidden after switching back to Trắc nghiệm while the mic session is open | |
| 5 | Mac Chrome (Incognito) | Items 1, 2 and 4 | |
| 6 | Facebook in-app iOS | Tự nói shows the typed box; typed answers are graded | |
| 7 | Any | DB: new `n400_section_attempts` rows have `answer_mode` = voice (typed in in-app); choice answers have choice; a near confirmed with Đúng vậy adds no row | |
| 8 | Any | With `voice_speaking` off: no switch appears, and Làm lại starts a new session at question 1 (not the old summary) | |

## Decision (owner)

- Gate S2 pass? <yes/no>
