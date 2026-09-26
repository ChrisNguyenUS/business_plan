# N400 Speaking Oral Answers — Gate S3 (Thi thử Speaking device pass)

**Spec:** docs/superpowers/specs/2026-09-25-n400-speaking-oral-answers-design.md §5.1 · **Plan:** docs/superpowers/plans/2026-09-26-n400-speaking-oral-s3-mock.md
**Prereqs:** S3 deployed; `voice_speaking` ON (it is, since Gate S2).

| # | Environment | Check | Result |
|---|---|---|---|
| 1 | iPhone Safari | Thi thử → Speaking shows the intro with **Cách trả lời**; pick **Trả lời bằng giọng** → Bắt đầu. Each item: 🔊 plays, you speak, "App nghe được: …", **Đúng vậy** locks, **Nói lại** works once. Nothing shows right/wrong before the end | |
| 2 | iPhone Safari | A Yes/No item: say "I don't know" → "Bạn trả lời Yes hay No? Hãy nói lại." and **Nói lại** is still offered; then say "No" and confirm | |
| 3 | iPhone Safari | Result: each row says "Bạn nói: …"; wrong rows show the accepted answer; a partial What-mean answer counts as wrong. Tap 🔊 on a row, then **Thi lại**: the first item's mic still hears you | |
| 4 | iPhone Safari | During a voice run the slow 🔊 is hidden | |
| 5 | Any | **Trắc nghiệm** run works as before; the choice (Trắc nghiệm / giọng) is remembered on the next visit | |
| 6 | Mac Chrome (Incognito) | Items 1–3 | |
| 7 | Facebook in-app iOS | The intro offers voice; the run uses the typed box ("Bạn trả lời: …" on the result) | |
| 8 | Any | DB: the new `n400_section_mock_results` row has `answer_mode` = voice (typed in-app; choice runs keep choice) | |
| 9 | Firefox (no speech API) | No intro: the test starts directly in multiple choice, as before | |

## Decision (owner)

- Gate S3 pass? <yes/no>
