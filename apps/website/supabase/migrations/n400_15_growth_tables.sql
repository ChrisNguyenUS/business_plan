-- Growth Engine G1: data tables (spec docs/superpowers/specs/2026-07-19-n400-growth-engine-design.md §1).
-- Append-only event log + lead profile + prompt state + consultation requests + CTA decision log.

-- ── n400_growth_events (append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.n400_growth_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_n400_growth_events_user_type
  ON public.n400_growth_events (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_n400_growth_events_created
  ON public.n400_growth_events (created_at);
-- One-shot lifecycle events must never duplicate — not if profiles gets
-- re-created/synced from auth, not on trigger re-fire, not on migration
-- replay. Enforced at the storage layer, not just in emitter code.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_n400_growth_events_once
  ON public.n400_growth_events (user_id, event_type)
  WHERE event_type IN ('account_created','onboarding_completed','address_entered');

-- ── n400_lead_profiles (1 row/user) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.n400_lead_profiles (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_stage       TEXT CHECK (journey_stage IN ('exploring','preparing','filed','waiting_interview','interview_scheduled')),
  n400_filed          BOOLEAN,
  filing_timeline     TEXT CHECK (filing_timeline IN ('30d','3m','6m','exploring')),
  interview_scheduled BOOLEAN,
  interview_date      DATE,
  wants_guidance      TEXT CHECK (wants_guidance IN ('yes','maybe','no')),
  service_interest    TEXT[] NOT NULL DEFAULT '{}',
  lead_score          INT NOT NULL DEFAULT 0,
  lead_status         TEXT NOT NULL DEFAULT 'cold' CHECK (lead_status IN ('cold','warm','hot','sales_ready')),
  consultation_requested_at TIMESTAMPTZ,
  consultation_booked_at    TIMESTAMPTZ,
  last_growth_prompt_at     TIMESTAMPTZ,
  first_touch         JSONB,
  last_touch          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── n400_profile_prompts (conversation memory) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.n400_profile_prompts (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key  TEXT NOT NULL,
  shown_count   INT NOT NULL DEFAULT 0,
  last_shown_at TIMESTAMPTZ,
  answered_at   TIMESTAMPTZ,
  skipped_at    TIMESTAMPTZ,
  snooze_until  TIMESTAMPTZ,
  PRIMARY KEY (user_id, question_key)
);

-- ── n400_consultation_requests ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.n400_consultation_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  preferred_time TEXT,
  topic          TEXT CHECK (topic IN ('n400_review','interview_prep','writing','speaking','other')),
  source_cta     TEXT,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','done','no_show','cancelled')),
  outcome        TEXT CHECK (outcome IN ('won','lost','follow_up')),
  outcome_note   TEXT,
  note           TEXT,
  first_touch    JSONB,
  last_touch     JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_n400_consultation_requests_status
  ON public.n400_consultation_requests (status, created_at DESC);

-- ── n400_cta_decision_log (debug, 30-day retention — cleanup ships with the G3 evaluator) ──
CREATE TABLE IF NOT EXISTS public.n400_cta_decision_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eligible_ctas TEXT[] NOT NULL DEFAULT '{}',
  selected_cta  TEXT,
  reason        TEXT
);
CREATE INDEX IF NOT EXISTS idx_n400_cta_decision_log_user
  ON public.n400_cta_decision_log (user_id, evaluated_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.n400_growth_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_lead_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_profile_prompts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_cta_decision_log     ENABLE ROW LEVEL SECURITY;

-- Events: user may INSERT only whitelisted client-side event types for themself.
-- Server-authoritative types (practice_completed, mock_completed, ...) are inserted
-- by SECURITY DEFINER trigger functions and bypass this policy. No UPDATE/DELETE
-- policies exist on purpose — the log is append-only for everyone but the owner role.
CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND event_type IN ('cta_shown','cta_dismissed','cta_clicked',
                       'prompt_answered','prompt_skipped',
                       'checklist_viewed','consultation_form_opened')
  );
CREATE POLICY "n400 growth events own read" ON public.n400_growth_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "n400 growth events admin read" ON public.n400_growth_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lead profiles: readable by owner + admin; ALL writes go through SECURITY DEFINER
-- functions (no INSERT/UPDATE policy for users — score must be tamper-proof).
CREATE POLICY "n400 lead profiles own read" ON public.n400_lead_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "n400 lead profiles admin read" ON public.n400_lead_profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Prompt state: owner read; writes via G2 RPC only.
CREATE POLICY "n400 profile prompts own read" ON public.n400_profile_prompts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "n400 profile prompts admin read" ON public.n400_profile_prompts
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Consultation requests: owner insert/read; staff read/update (status, outcome, notes).
CREATE POLICY "n400 consultation own insert" ON public.n400_consultation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n400 consultation own read" ON public.n400_consultation_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "n400 consultation admin read" ON public.n400_consultation_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 consultation admin update" ON public.n400_consultation_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Decision log: staff-only read; inserts come from the G3 evaluator (definer fn).
CREATE POLICY "n400 cta decision log admin read" ON public.n400_cta_decision_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
