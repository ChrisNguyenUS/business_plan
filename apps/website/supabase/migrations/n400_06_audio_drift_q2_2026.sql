-- N400 — Reconcile state-level officials with owner's audio recordings (2026-Q2 drift).
-- Phase 1 seeded officials current as of 2025-Q4. Two senators were appointed after
-- the prior holders moved to federal posts, one was succeeded mid-term, and two
-- governorships flipped in the November 2025 elections. The voice recordings under
-- N400_voice/ are the source of truth (it's what the user hears), so DB rows are
-- updated to match the recordings.
--
-- Q23 (your state's senators): Florida → Ashley Moody (replaced Marco Rubio →
--   appointed Sec of State); Ohio → Jon Husted (replaced JD Vance → VP);
--   Oklahoma → Alan Armstrong (replaced Markwayne Mullin).
-- Q61 (your state's governor): New Jersey → Mikie Sherrill; Virginia → Abigail
--   Spanberger (both flipped Nov 2025).

UPDATE n400_location_answers SET answer_en = 'Ashley Moody', answer_vi = 'Ashley Moody'
  WHERE question_id = 23 AND state_code = 'FL' AND answer_en = 'Marco Rubio';

UPDATE n400_location_answers SET answer_en = 'Jon Husted', answer_vi = 'Jon Husted'
  WHERE question_id = 23 AND state_code = 'OH' AND answer_en = 'JD Vance';

UPDATE n400_location_answers SET answer_en = 'Alan Armstrong', answer_vi = 'Alan Armstrong'
  WHERE question_id = 23 AND state_code = 'OK' AND answer_en = 'Markwayne Mullin';

UPDATE n400_location_answers SET answer_en = 'Mikie Sherrill', answer_vi = 'Mikie Sherrill'
  WHERE question_id = 61 AND state_code = 'NJ' AND answer_en = 'Phil Murphy';

UPDATE n400_location_answers SET answer_en = 'Abigail Spanberger', answer_vi = 'Abigail Spanberger'
  WHERE question_id = 61 AND state_code = 'VA' AND answer_en = 'Glenn Youngkin';

-- Mirror to n400_state_data flat fields.
UPDATE n400_state_data SET senator_1 = 'Ashley Moody'   WHERE state_code = 'FL';
UPDATE n400_state_data SET senator_2 = 'Jon Husted'     WHERE state_code = 'OH';
UPDATE n400_state_data SET senator_2 = 'Alan Armstrong' WHERE state_code = 'OK';
UPDATE n400_state_data SET governor_name = 'Mikie Sherrill'     WHERE state_code = 'NJ';
UPDATE n400_state_data SET governor_name = 'Abigail Spanberger' WHERE state_code = 'VA';
