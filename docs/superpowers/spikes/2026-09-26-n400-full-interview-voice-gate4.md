# N400 Speaking Oral Answers — Gate S4 (Phỏng vấn đầy đủ device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §5.2, §9 · **Plan:** docs/superpowers/plans/2026-09-26-n400-speaking-oral-s4-full-interview.md
**Prereqs:** S4 deployed; `voice_speaking` ON (it is).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Phỏng vấn đầy đủ: the intro shows **Cách trả lời: [Trắc nghiệm, Toàn bộ bằng giọng]** with the note; pick **Toàn bộ bằng giọng** → Bắt đầu | |
| 2 | iPhone Safari | Civics part by voice: "App nghe được: …", **Đúng vậy** locks, **Nói lại** once; nothing shows right/wrong mid-test. A question with no answer for your address stays multiple choice | |
| 3 | iPhone Safari | Speaking part by voice; a Yes/No "I don't know" is asked again and **Nói lại** is still offered | |
| 4 | iPhone Safari | Writing part unchanged (typed dictation); interludes and the stepper as before | |
| 5 | iPhone Safari | Result → **Xem lại đáp án**: voice rows say "Bạn nói: …". Tap 🔊 in the review, then Thi lại by voice: the first Civics item's mic still hears you | |
| 6 | iPhone Safari | Turn off Siri & Dictation (or deny the mic) mid-run: the remaining voice items are typed, in both parts, never multiple choice | |
| 7 | Any | **Trắc nghiệm** run works exactly as before; the choice is remembered on the next visit | |
| 8 | Mac Chrome (Incognito) | Items 1–3 and 5 | |
| 9 | Facebook in-app iOS | The intro offers voice; both parts use the typed box | |
| 10 | Any | DB: the Civics part's `n400_quiz_attempts.answer_mode` = voice and its `n400_question_attempts` rows have the words; the Speaking part's `n400_section_mock_results.answer_mode` = voice; a choice run writes neither | |
| 11 | Any | Privacy Policy §8 (EN + VI): "civics and interview questions", "For Civics mock tests" | |

## Decision (owner)

- Gate S4 pass? <yes/no>
- On yes: add the ROADMAP entry for Speaking + Full-interview voice answers (`voice_speaking` is already ON 100%).
