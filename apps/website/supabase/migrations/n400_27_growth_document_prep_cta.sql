-- Growth Engine: replace the Filing Checklist rung with a free document-prep
-- support call. The checklist self-serve page is removed; for a "haven't filed
-- yet" user (journey_stage 'preparing') the escalation ladder now offers a free
-- support call for Manna's document-prep service — a consultation with its own
-- topic, reusing the entire G3b booking flow (form → Resend + CAPI Lead).
--
-- s10 moves from the education group (open_checklist) to the consultation group
-- (book_consultation). Priority 55 sits just above s3_filing_stalled (50, the
-- "stalled 60 days" free-review re-nudge) so the primary preparing-user offer
-- outranks it, and below s2_consistency (60) which needs 20 practice days a
-- fresh preparing user won't have yet. topicForCta maps the s10_ prefix to the
-- 'document_prep' consultation topic.
--
-- Reachable only once `profiling` is on (journey_stage is set solely by prompt
-- answers); booking_form is already on globally, so no per-user flag gates this.

-- Retire the checklist CTA (education / open_checklist).
DELETE FROM public.n400_cta_definitions WHERE cta_id = 's10_filing_checklist';

-- Seed the document-prep support-call CTA.
INSERT INTO public.n400_cta_definitions
  (cta_id, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority) VALUES
  ('s10_document_prep','consultation',
   'Need help preparing your N-400?','Bạn cần giúp đỡ chuẩn bị hồ sơ N-400?',
   'Book a free support call and the Manna team will help you prepare your documents.','Đặt buổi hỗ trợ miễn phí — đội ngũ Manna sẽ giúp bạn chuẩn bị giấy tờ.',
   'Book Free Support Call','Đặt lịch hẹn hỗ trợ miễn phí','book_consultation','{"journey_stage": "preparing"}',55)
ON CONFLICT (cta_id, variant) DO NOTHING;

-- Retire the now-unused filing_checklist feature flag (the whole checklist
-- feature is gone; no code references it after this change).
DELETE FROM public.n400_feature_flags WHERE flag_key = 'filing_checklist';
