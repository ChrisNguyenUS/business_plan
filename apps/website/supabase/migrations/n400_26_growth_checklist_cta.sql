-- Growth Engine G3c: seed the Filing Checklist education CTA — the
-- escalation ladder's "Free Checklist" rung (spec §4.1 rule 6, §3.4
-- filed=not_yet). Priority 45: below s3 (50 — by the time a preparing user
-- has stalled 60 days, the checklist rung was already offered) and above
-- s7 (40 — a not-yet-filed user's next step is the checklist, not a mock).
--
-- Unreachable until BOTH the `filing_checklist` flag is on (availableActions
-- gates the action) AND `profiling` is on (journey_stage is only ever set by
-- prompt answers) — seeding ahead of the flag flip is the n400_16 pattern.
INSERT INTO public.n400_cta_definitions
  (cta_id, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority) VALUES
  ('s10_filing_checklist','education',
   '✓ N-400 Filing Checklist','✓ Checklist chuẩn bị hồ sơ N-400',
   'The steps and documents to prepare before you file — a 3-minute read.','Các bước và giấy tờ cần chuẩn bị trước khi nộp — đọc chỉ 3 phút.',
   'Open the checklist','Xem checklist','open_checklist','{"journey_stage": "preparing"}',45)
ON CONFLICT (cta_id, variant) DO NOTHING;
