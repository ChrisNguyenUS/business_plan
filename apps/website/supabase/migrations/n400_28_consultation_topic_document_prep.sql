-- Fix: the 'document_prep' consultation topic was never allowed by the database.
--
-- G3c (n400_27) pivoted the "haven't filed yet" rung from a self-serve filing
-- checklist to a free document-prep support call, and added the topic on the
-- application side: booking.ts CONSULTATION_TOPICS lists 'document_prep', and
-- topicForCta maps the 's10_' CTA prefix onto it. But n400_27 only seeded the
-- CTA definition row — it never widened this CHECK constraint, and no later
-- migration did either.
--
-- Effect: a user with journey_stage='preparing' who takes the s10_document_prep
-- CTA submits a booking with topic='document_prep', the INSERT in
-- booking-actions.ts is rejected with SQLSTATE 23514, and the form reports the
-- generic 'insert_failed' error. The document-prep support call — the entire
-- point of the G3c pivot — cannot be booked.
--
-- Latent so far, not yet damaging: verified 2026-09-23 that the table holds 0
-- requests and s10_document_prep has 0 impressions, so nothing was lost. It
-- would have failed on the first real preparing-stage user.
--
-- The new value set is a strict superset of the old one and mirrors
-- apps/website/src/lib/n400/growth/booking.ts:3 exactly (same order), so no
-- existing row can fail revalidation.

ALTER TABLE public.n400_consultation_requests
  DROP CONSTRAINT IF EXISTS n400_consultation_requests_topic_check;

ALTER TABLE public.n400_consultation_requests
  ADD CONSTRAINT n400_consultation_requests_topic_check
  CHECK (topic IN ('document_prep','n400_review','interview_prep','writing','speaking','other'));
