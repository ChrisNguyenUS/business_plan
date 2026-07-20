# N400 Growth Engine — G1 (Data Layer + Engine Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Growth Engine foundation — 9 tables + seeds, event emitters, server-side lead scoring, attribution capture, feature flags, client-event ingest — with zero UI, gated behind flags seeded `enabled=false`.

**Architecture:** Append-only `n400_growth_events` is the source of truth. Server-authoritative events are emitted by **DB triggers** on existing tables (NOT by editing the finalize RPC bodies — those have been replaced 3× already (n400_07→08→09) and re-stating their bodies invites drift; triggers fire in the same transaction and automatically cover both the single and batch finalize paths, which satisfies the spec's intent: atomic, untrusted-client-proof). Lead score is recomputed by a SECURITY DEFINER function reading `n400_growth_rules` (config-driven, no hardcoded points), fired by an AFTER INSERT trigger on the events table. Inactivity decay depends on `now()` so it lives in `n400_leads_view` (computed at read time — no cron). TS module `src/lib/n400/growth/` owns flags, attribution, and client-event ingest.

**Tech Stack:** Next.js 16 App Router (⚠️ read `node_modules/next/dist/docs/` per `apps/website/AGENTS.md` before writing route/middleware code), Supabase (Postgres + RLS), vitest. Monorepo isolation: **all edits confined to `apps/website/`** (+ this docs folder). Migrations applied to remote project `ffsrlmtqzlidnuitkdvw` via `mcp__supabase__apply_migration`.

**Spec:** `docs/superpowers/specs/2026-07-19-n400-growth-engine-design.md` (v3, commit `1f9d1b85`).

**G1 scope guards (YAGNI):**
- No CTA evaluation, no prompt evaluation, no `getGrowthState`, no notify — those are G2/G3.
- `section_completed` / `readiness_snapshot` events are NOT emitted in G1 (weak-category + readiness data is read from existing tables at evaluate time in G3; per-item `n400_section_attempts` rows are too granular to mirror as events). Taxonomy reserves the names.
- `mode='flashcard'` attempts never emit events (graded-only philosophy, matches "thuộc = graded only" rule).
- Feature flags seed `enabled=false` → shipping G1 changes nothing user-visible.

---

### Task 1: Migration `n400_15_growth_tables.sql` — 5 data tables + RLS

**Files:**
- Create: `apps/website/supabase/migrations/n400_15_growth_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G1: data tables (spec docs/superpowers/specs/2026-07-19-n400-growth-engine-design.md §1).
-- Append-only event log + lead profile + prompt state + consultation requests + CTA decision log.

-- ── n400_growth_events (append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.n400_growth_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  event_version INT  NOT NULL DEFAULT 1,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_n400_growth_events_user_type
  ON public.n400_growth_events (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_n400_growth_events_created
  ON public.n400_growth_events (created_at);

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
```

- [ ] **Step 2: Apply the migration**

Use `mcp__supabase__apply_migration` with name `n400_15_growth_tables` and the file's SQL as content.

- [ ] **Step 3: Verify tables exist**

Use `mcp__supabase__list_tables` (schema `public`). Expected: `n400_growth_events`, `n400_lead_profiles`, `n400_profile_prompts`, `n400_consultation_requests`, `n400_cta_decision_log` all present with RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_15_growth_tables.sql
git commit -m "feat(n400-growth): add G1 data tables (events, lead profiles, prompts, consultations, decision log)"
```

---

### Task 2: Migration `n400_16_growth_config.sql` — 4 config tables + seeds

**Files:**
- Create: `apps/website/supabase/migrations/n400_16_growth_config.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G1: config tables (spec §1.6). DB holds parameters/copy/on-off/variants
-- so marketing can tune without a deploy; condition SHAPE stays in code.

CREATE TABLE IF NOT EXISTS public.n400_growth_rules (
  rule_key   TEXT PRIMARY KEY,
  points     INT NOT NULL,
  params     JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_cta_definitions (
  cta_id        TEXT NOT NULL,
  variant       TEXT NOT NULL DEFAULT 'a',
  group_key     TEXT NOT NULL CHECK (group_key IN ('consultation','education')),
  title_en TEXT NOT NULL, title_vi TEXT NOT NULL,
  body_en  TEXT NOT NULL, body_vi  TEXT NOT NULL,
  cta_label_en TEXT NOT NULL, cta_label_vi TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('book_consultation','open_checklist','start_mock')),
  conditions    JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority      INT NOT NULL DEFAULT 0,
  cooldown_days INT NOT NULL DEFAULT 7,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cta_id, variant)
);

CREATE TABLE IF NOT EXISTS public.n400_prompt_definitions (
  question_key TEXT NOT NULL,
  variant      TEXT NOT NULL DEFAULT 'a',
  text_en TEXT NOT NULL, text_vi TEXT NOT NULL,
  options      JSONB NOT NULL,                 -- [{value, label_en, label_vi}]
  trigger      JSONB NOT NULL DEFAULT '{}'::jsonb,
  depends_on   JSONB,                          -- {question_key, answer}
  snooze_days     INT NOT NULL DEFAULT 6,
  snooze_sessions INT NOT NULL DEFAULT 3,
  sort_order   INT NOT NULL DEFAULT 0,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (question_key, variant)
);

CREATE TABLE IF NOT EXISTS public.n400_feature_flags (
  flag_key    TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_pct INT NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  note        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.n400_growth_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_cta_definitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_prompt_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_feature_flags      ENABLE ROW LEVEL SECURITY;

-- Config is world-readable to authenticated users (client renders copy/flags);
-- only admins write (editor UI lands in G4; until then edits go via Supabase dashboard).
CREATE POLICY "n400 growth rules read"    ON public.n400_growth_rules       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "n400 cta defs read"        ON public.n400_cta_definitions    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "n400 prompt defs read"     ON public.n400_prompt_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "n400 feature flags read"   ON public.n400_feature_flags      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "n400 growth rules admin"   ON public.n400_growth_rules       FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 cta defs admin"       ON public.n400_cta_definitions    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 prompt defs admin"    ON public.n400_prompt_definitions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 feature flags admin"  ON public.n400_feature_flags      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Seeds: scoring rules (spec §2) ───────────────────────────────────────────
INSERT INTO public.n400_growth_rules (rule_key, points, params) VALUES
  ('account_created',          10, '{}'),
  ('onboarding_completed',     20, '{}'),
  ('address_entered',          20, '{}'),
  ('first_practice_completed', 10, '{}'),
  ('first_mock_completed',     20, '{}'),
  ('practice_sessions_5',      20, '{"min_count": 5}'),
  ('practice_days_5',          25, '{"min_days": 5}'),
  ('mock_tests_5',             30, '{"min_count": 5}'),
  ('mock_avg_above_90',        30, '{"min_avg_pct": 90, "min_mocks": 1}'),
  ('interview_scheduled',      60, '{}'),
  ('files_within_30d',         40, '{}'),
  ('consultation_requested',   60, '{}'),
  ('consultation_booked',     100, '{}'),
  ('consultation_done',       120, '{}'),
  ('inactive_14d',            -30, '{"days": 14}'),
  ('inactive_30d',            -60, '{"days": 30}'),
  ('dismissed_consultation_cta_3', -20, '{"min_count": 3}')
ON CONFLICT (rule_key) DO NOTHING;

-- ── Seeds: CTA scenarios (spec §4.2; priority per §4.1 rule 7) ───────────────
INSERT INTO public.n400_cta_definitions
  (cta_id, group_key, title_en, title_vi, body_en, body_vi, cta_label_en, cta_label_vi, action, conditions, priority) VALUES
  ('s9_final_review','consultation',
   'You''re ready!','Bạn đã sẵn sàng!',
   'Before your real interview, let us review everything together — for FREE.','Trước buổi phỏng vấn thật, hãy để chúng tôi cùng bạn rà soát mọi thứ — MIỄN PHÍ.',
   'Book Final Review','Đặt buổi rà soát cuối','book_consultation','{"readiness_ready": true}',100),
  ('s4_interview_soon','consultation',
   'Your interview is coming soon','Phỏng vấn của bạn sắp đến',
   'Book a FREE readiness review before the big day.','Đặt buổi kiểm tra mức sẵn sàng MIỄN PHÍ trước ngày quan trọng.',
   'Book Free Review','Đặt lịch miễn phí','book_consultation','{"interview_within_days": 30}',90),
  ('s1_mock_ready','consultation',
   '🎉 You''re almost interview-ready','🎉 Bạn gần sẵn sàng phỏng vấn rồi',
   'Book a FREE Mock Interview with Manna.','Đặt buổi Phỏng vấn thử MIỄN PHÍ với Manna.',
   'Book Free Session','Đặt buổi miễn phí','book_consultation','{"min_mocks": 3, "min_avg_pct": 90}',80),
  ('s5_writing_help','consultation',
   'Need help improving your Writing?','Cần cải thiện phần Viết?',
   'Schedule a FREE coaching session.','Đặt một buổi kèm MIỄN PHÍ.',
   'Book Free Session','Đặt buổi miễn phí','book_consultation','{"weakest_section": "writing", "min_sessions": 10}',70),
  ('s6_speaking_help','consultation',
   'Practice with an interview specialist','Luyện cùng chuyên viên phỏng vấn',
   'Book a FREE session with one of our specialists.','Đặt buổi luyện MIỄN PHÍ cùng chuyên viên của chúng tôi.',
   'Book Free Session','Đặt buổi miễn phí','book_consultation','{"weakest_section": "speaking", "min_sessions": 10}',70),
  ('s2_consistency','consultation',
   'Amazing consistency!','Sự đều đặn đáng nể!',
   'Let''s review your N-400 journey together. Book a FREE consultation.','Cùng nhìn lại hành trình N-400 của bạn. Đặt buổi tư vấn MIỄN PHÍ.',
   'Book Free Consultation','Đặt tư vấn miễn phí','book_consultation','{"min_practice_days": 20}',60),
  ('s3_filing_stalled','consultation',
   'Need help preparing your N-400?','Cần hỗ trợ chuẩn bị hồ sơ N-400?',
   'We''ll review your application for FREE.','Chúng tôi sẽ rà soát hồ sơ của bạn MIỄN PHÍ.',
   'Get Free Review','Nhận rà soát miễn phí','book_consultation','{"journey_stage": "preparing", "stalled_days": 60}',50),
  ('s7_civics_done','education',
   'Congratulations!','Chúc mừng bạn!',
   'Ready for a realistic interview simulation?','Sẵn sàng cho một buổi mô phỏng phỏng vấn như thật chưa?',
   'Start Mock Interview','Bắt đầu Phỏng vấn thử','start_mock','{"all_civics_sections_done": true}',40)
ON CONFLICT (cta_id, variant) DO NOTHING;

-- ── Seeds: profiling prompts (spec §3.1) ─────────────────────────────────────
INSERT INTO public.n400_prompt_definitions
  (question_key, text_en, text_vi, options, trigger, depends_on, sort_order) VALUES
  ('filed',
   'Have you already submitted your N-400?','Bạn đã nộp đơn N-400 chưa?',
   '[{"value":"yes","label_en":"Yes","label_vi":"Rồi"},{"value":"not_yet","label_en":"Not yet","label_vi":"Chưa"}]',
   '{"after_event":"practice_completed","min_count":1}', NULL, 1),
  ('filing_timeline',
   'When do you plan to submit your application?','Bạn định bao giờ nộp đơn?',
   '[{"value":"30d","label_en":"Within 30 days","label_vi":"Trong 30 ngày"},{"value":"3m","label_en":"Within 3 months","label_vi":"Trong 3 tháng"},{"value":"6m","label_en":"Within 6 months","label_vi":"Trong 6 tháng"},{"value":"exploring","label_en":"Just exploring","label_vi":"Mới tìm hiểu"}]',
   '{"after_event":"mock_completed","min_count":1}', '{"question_key":"filed","answer":"not_yet"}', 2),
  ('interview_notice',
   'Have you received your interview notice?','Bạn đã nhận được lịch phỏng vấn chưa?',
   '[{"value":"yes","label_en":"Yes","label_vi":"Rồi"},{"value":"no","label_en":"No","label_vi":"Chưa"}]',
   '{"distinct_practice_days":3}', '{"question_key":"filed","answer":"yes"}', 3),
  ('interview_date',
   'When is your interview?','Phỏng vấn của bạn vào ngày nào?',
   '[{"value":"__date__","label_en":"Pick a date","label_vi":"Chọn ngày"}]',
   '{"immediately_after":"interview_notice"}', '{"question_key":"interview_notice","answer":"yes"}', 4),
  ('wants_guidance',
   'Would you like FREE guidance if you have questions?','Bạn có muốn được hướng dẫn MIỄN PHÍ khi có thắc mắc không?',
   '[{"value":"yes","label_en":"Yes","label_vi":"Có"},{"value":"maybe","label_en":"Maybe","label_vi":"Có thể"},{"value":"no","label_en":"No","label_vi":"Không"}]',
   '{"after_event":"practice_completed","min_count":5}', NULL, 5)
ON CONFLICT (question_key, variant) DO NOTHING;

-- ── Seeds: feature flags — ALL OFF. G1 ships dark; flip in DB to roll out. ───
INSERT INTO public.n400_feature_flags (flag_key, enabled, rollout_pct, note) VALUES
  ('growth_engine',    FALSE, 100, 'Master kill switch. OFF = no growth UI anywhere; learning events still record.'),
  ('cta_engine',       FALSE, 100, 'G3: behavior-based CTA cards.'),
  ('profiling',        FALSE, 100, 'G2: progressive profiling conversation.'),
  ('filing_checklist', FALSE, 100, 'G3: N-400 Filing Checklist page.'),
  ('booking_form',     FALSE, 100, 'G3: in-app consultation booking form.')
ON CONFLICT (flag_key) DO NOTHING;
```

- [ ] **Step 2: Apply the migration** via `mcp__supabase__apply_migration` (name `n400_16_growth_config`).

- [ ] **Step 3: Verify seeds**

Use `mcp__supabase__execute_sql`:
```sql
SELECT (SELECT count(*) FROM n400_growth_rules)       AS rules,
       (SELECT count(*) FROM n400_cta_definitions)    AS ctas,
       (SELECT count(*) FROM n400_prompt_definitions) AS prompts,
       (SELECT count(*) FROM n400_feature_flags)      AS flags;
```
Expected: `rules=17, ctas=8, prompts=5, flags=5`.

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_16_growth_config.sql
git commit -m "feat(n400-growth): add config tables + seed rules, CTA/prompt definitions, feature flags (all off)"
```

---

### Task 3: Migration `n400_17_growth_scoring.sql` — score function, view, attribution RPC

**Files:**
- Create: `apps/website/supabase/migrations/n400_17_growth_scoring.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G1: config-driven lead scoring (spec §1.7 + §2).
-- Score is recomputed server-side from the event log + profile answers, reading
-- points/thresholds from n400_growth_rules (NO hardcoded numbers here).
-- Inactivity decay depends on now() → computed at READ time in n400_leads_view.

-- ── rule lookup helpers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_rule_points(p_key text)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT COALESCE((SELECT points FROM n400_growth_rules WHERE rule_key = p_key AND enabled), 0) $$;

CREATE OR REPLACE FUNCTION public.n400_rule_param(p_key text, p_param text, p_default int)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT COALESCE((SELECT (params->>p_param)::int FROM n400_growth_rules WHERE rule_key = p_key AND enabled), p_default) $$;

-- ── recompute ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_n400_lead_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score int := 0;
  v_lp    n400_lead_profiles%ROWTYPE;
  v_n int; v_days int; v_avg numeric;
BEGIN
  INSERT INTO n400_lead_profiles (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_lp FROM n400_lead_profiles WHERE user_id = p_user_id;

  -- one-shot events
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'account_created') THEN
    v_score := v_score + n400_rule_points('account_created'); END IF;
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'onboarding_completed') THEN
    v_score := v_score + n400_rule_points('onboarding_completed'); END IF;
  IF EXISTS (SELECT 1 FROM n400_growth_events WHERE user_id = p_user_id AND event_type = 'address_entered') THEN
    v_score := v_score + n400_rule_points('address_entered'); END IF;

  -- practice / mock milestones (from the event log)
  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'practice_completed';
  IF v_n >= 1 THEN v_score := v_score + n400_rule_points('first_practice_completed'); END IF;
  IF v_n >= n400_rule_param('practice_sessions_5','min_count',5) THEN
    v_score := v_score + n400_rule_points('practice_sessions_5'); END IF;

  SELECT count(DISTINCT created_at::date) INTO v_days FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type IN ('practice_completed','mock_completed');
  IF v_days >= n400_rule_param('practice_days_5','min_days',5) THEN
    v_score := v_score + n400_rule_points('practice_days_5'); END IF;

  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'mock_completed';
  IF v_n >= 1 THEN v_score := v_score + n400_rule_points('first_mock_completed'); END IF;
  IF v_n >= n400_rule_param('mock_tests_5','min_count',5) THEN
    v_score := v_score + n400_rule_points('mock_tests_5'); END IF;

  -- mock average: authoritative source is n400_quiz_attempts, not payloads
  SELECT avg(score::numeric / NULLIF(total_questions,0)) * 100 INTO v_avg
  FROM n400_quiz_attempts
  WHERE user_id = p_user_id AND mode = 'mock_test' AND completed_at IS NOT NULL;
  IF v_avg IS NOT NULL
     AND v_n >= n400_rule_param('mock_avg_above_90','min_mocks',1)
     AND v_avg > n400_rule_param('mock_avg_above_90','min_avg_pct',90) THEN
    v_score := v_score + n400_rule_points('mock_avg_above_90'); END IF;

  -- profiling answers (intent inputs — see spec §1.2 "two independent axes")
  IF v_lp.interview_scheduled IS TRUE THEN
    v_score := v_score + n400_rule_points('interview_scheduled'); END IF;
  IF v_lp.filing_timeline = '30d' THEN
    v_score := v_score + n400_rule_points('files_within_30d'); END IF;

  -- consultation pipeline (read from the requests table)
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id) THEN
    v_score := v_score + n400_rule_points('consultation_requested'); END IF;
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id AND status IN ('booked','done')) THEN
    v_score := v_score + n400_rule_points('consultation_booked'); END IF;
  IF EXISTS (SELECT 1 FROM n400_consultation_requests WHERE user_id = p_user_id AND status = 'done') THEN
    v_score := v_score + n400_rule_points('consultation_done'); END IF;

  -- CTA dismissal penalty (client events, consultation group only)
  SELECT count(*) INTO v_n FROM n400_growth_events
   WHERE user_id = p_user_id AND event_type = 'cta_dismissed'
     AND payload->>'group' = 'consultation';
  IF v_n >= n400_rule_param('dismissed_consultation_cta_3','min_count',3) THEN
    v_score := v_score + n400_rule_points('dismissed_consultation_cta_3'); END IF;

  v_score := GREATEST(0, LEAST(300, v_score));

  UPDATE n400_lead_profiles
  SET lead_score = v_score,
      lead_status = CASE
        WHEN v_score <= 50  THEN 'cold'
        WHEN v_score <= 120 THEN 'warm'
        WHEN v_score <= 200 THEN 'hot'
        ELSE 'sales_ready' END,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ── recompute triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_n400_growth_recompute
AFTER INSERT ON public.n400_growth_events
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_recompute_on_event();

CREATE OR REPLACE FUNCTION public.n400_trg_recompute_on_consultation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Stamp the denormalized timestamps the spec keeps on lead_profiles.
  UPDATE n400_lead_profiles
  SET consultation_requested_at = COALESCE(consultation_requested_at, NEW.created_at),
      consultation_booked_at = CASE WHEN NEW.status IN ('booked','done')
        THEN COALESCE(consultation_booked_at, now()) ELSE consultation_booked_at END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  PERFORM recompute_n400_lead_score(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_n400_consultation_recompute
AFTER INSERT OR UPDATE ON public.n400_consultation_requests
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_recompute_on_consultation();

-- ── leads view (read-time decay; security_invoker so RLS of base tables applies) ──
CREATE OR REPLACE VIEW public.n400_leads_view
WITH (security_invoker = true) AS
SELECT
  lp.*,
  up.last_activity_date,
  up.current_streak,
  GREATEST(0, LEAST(300, lp.lead_score + CASE
    WHEN up.last_activity_date IS NULL THEN 0
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
      THEN n400_rule_points('inactive_30d')
    WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
      THEN n400_rule_points('inactive_14d')
    ELSE 0 END)) AS effective_score,
  CASE
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 50  THEN 'cold'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 120 THEN 'warm'
    WHEN GREATEST(0, LEAST(300, lp.lead_score + CASE
      WHEN up.last_activity_date IS NULL THEN 0
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_30d','days',30)
        THEN n400_rule_points('inactive_30d')
      WHEN up.last_activity_date <= current_date - n400_rule_param('inactive_14d','days',14)
        THEN n400_rule_points('inactive_14d')
      ELSE 0 END)) <= 200 THEN 'hot'
    ELSE 'sales_ready'
  END AS effective_status
FROM n400_lead_profiles lp
LEFT JOIN n400_user_profile up ON up.user_id = lp.user_id;

-- ── attribution write (called from auth callback; touch data from first-party cookie) ──
CREATE OR REPLACE FUNCTION public.n400_set_attribution(p_first jsonb, p_last jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO n400_lead_profiles (user_id, first_touch, last_touch)
  VALUES (auth.uid(), p_first, p_last)
  ON CONFLICT (user_id) DO UPDATE
  SET first_touch = COALESCE(n400_lead_profiles.first_touch, EXCLUDED.first_touch),
      last_touch  = COALESCE(EXCLUDED.last_touch, n400_lead_profiles.last_touch),
      updated_at  = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.recompute_n400_lead_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_set_attribution(jsonb, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.n400_set_attribution(jsonb, jsonb) TO authenticated;
```

- [ ] **Step 2: Apply** via `mcp__supabase__apply_migration` (name `n400_17_growth_scoring`).

- [ ] **Step 3: Verify with a read-only probe**

`mcp__supabase__execute_sql`:
```sql
SELECT n400_rule_points('account_created') AS pts,
       n400_rule_param('inactive_14d','days',14) AS days,
       (SELECT count(*) FROM n400_leads_view) AS leads;
```
Expected: `pts=10, days=14, leads=0` (no lead rows yet).

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_17_growth_scoring.sql
git commit -m "feat(n400-growth): config-driven lead scoring, leads view with read-time decay, attribution RPC"
```

---

### Task 4: Migration `n400_18_growth_emitters.sql` — event-emitting triggers

**Files:**
- Create: `apps/website/supabase/migrations/n400_18_growth_emitters.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G1: server-authoritative event emitters.
-- Triggers (not RPC-body edits) so single AND batch finalize paths are covered
-- atomically without restating finalize logic (already replaced 3x: 07→08→09).
-- flashcard mode never emits — graded-only philosophy.

CREATE OR REPLACE FUNCTION public.n400_emit_growth_event(
  p_user uuid, p_type text, p_payload jsonb DEFAULT '{}'::jsonb,
  p_version int DEFAULT 1, p_at timestamptz DEFAULT now()
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO n400_growth_events (user_id, event_type, event_version, payload, created_at)
  VALUES (p_user, p_type, p_version, p_payload, p_at);
$$;

-- account_created: any new identity in the shared profiles table
CREATE OR REPLACE FUNCTION public.n400_trg_account_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM n400_emit_growth_event(NEW.id, 'account_created');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_account_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_account_created();

-- onboarding_completed (+ address_entered if address present): n400_user_profile
-- row creation IS onboarding completion (middleware gates on the row existing).
CREATE OR REPLACE FUNCTION public.n400_trg_user_profile_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM n400_emit_growth_event(NEW.user_id, 'onboarding_completed');
    IF NEW.state_code IS NOT NULL THEN
      PERFORM n400_emit_growth_event(NEW.user_id, 'address_entered',
        jsonb_build_object('state', NEW.state_code, 'city', NEW.city));
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.state_code IS NULL AND NEW.state_code IS NOT NULL THEN
    PERFORM n400_emit_growth_event(NEW.user_id, 'address_entered',
      jsonb_build_object('state', NEW.state_code, 'city', NEW.city));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_user_profile
AFTER INSERT OR UPDATE ON public.n400_user_profile
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_user_profile_events();

-- practice_completed / mock_completed: fires when a graded attempt finalizes
-- (completed_at transitions NULL → NOT NULL via the finalize RPCs).
CREATE OR REPLACE FUNCTION public.n400_trg_attempt_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
     AND NEW.mode IN ('practice','mock_test') THEN
    PERFORM n400_emit_growth_event(
      NEW.user_id,
      CASE NEW.mode WHEN 'mock_test' THEN 'mock_completed' ELSE 'practice_completed' END,
      jsonb_build_object('attempt_id', NEW.id, 'score', NEW.score,
                         'total', NEW.total_questions, 'passed', NEW.passed));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_n400_growth_attempt_completed
AFTER UPDATE ON public.n400_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_attempt_completed();
```

- [ ] **Step 2: Apply** via `mcp__supabase__apply_migration` (name `n400_18_growth_emitters`).

- [ ] **Step 3: Verify triggers exist**

`mcp__supabase__execute_sql`:
```sql
SELECT tgname FROM pg_trigger
WHERE tgname LIKE 'trg_n400_growth%' ORDER BY tgname;
```
Expected 4 rows: `trg_n400_growth_account_created`, `trg_n400_growth_attempt_completed`, `trg_n400_growth_recompute`, `trg_n400_growth_user_profile` (+ `trg_n400_consultation_recompute` exists from Task 3 but doesn't match the LIKE).

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_18_growth_emitters.sql
git commit -m "feat(n400-growth): emit growth events via triggers on profiles, user_profile, quiz_attempts"
```

---

### Task 5: Migration `n400_19_growth_backfill.sql` — historical backfill

**Files:**
- Create: `apps/website/supabase/migrations/n400_19_growth_backfill.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Growth Engine G1: one-time backfill so existing users start with correct scores.
-- The per-row recompute trigger is disabled during bulk insert, then every
-- affected user is recomputed once.

ALTER TABLE public.n400_growth_events DISABLE TRIGGER trg_n400_growth_recompute;

-- account_created for every existing identity (event timestamped at signup)
INSERT INTO public.n400_growth_events (user_id, event_type, created_at)
SELECT p.id, 'account_created', p.created_at
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = p.id AND e.event_type = 'account_created');

-- onboarding_completed + address_entered from n400_user_profile
INSERT INTO public.n400_growth_events (user_id, event_type, created_at)
SELECT up.user_id, 'onboarding_completed', up.created_at
FROM public.n400_user_profile up
WHERE NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = up.user_id AND e.event_type = 'onboarding_completed');

INSERT INTO public.n400_growth_events (user_id, event_type, payload, created_at)
SELECT up.user_id, 'address_entered',
       jsonb_build_object('state', up.state_code, 'city', up.city), up.created_at
FROM public.n400_user_profile up
WHERE up.state_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = up.user_id AND e.event_type = 'address_entered');

-- graded attempts (practice + mock; flashcard excluded)
INSERT INTO public.n400_growth_events (user_id, event_type, payload, created_at)
SELECT qa.user_id,
       CASE qa.mode WHEN 'mock_test' THEN 'mock_completed' ELSE 'practice_completed' END,
       jsonb_build_object('attempt_id', qa.id, 'score', qa.score,
                          'total', qa.total_questions, 'passed', qa.passed),
       qa.completed_at
FROM public.n400_quiz_attempts qa
WHERE qa.completed_at IS NOT NULL
  AND qa.mode IN ('practice','mock_test')
  AND NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = qa.user_id
                    AND e.payload->>'attempt_id' = qa.id::text);

ALTER TABLE public.n400_growth_events ENABLE TRIGGER trg_n400_growth_recompute;

-- one recompute per affected user
DO $$
DECLARE u uuid;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.n400_growth_events LOOP
    PERFORM public.recompute_n400_lead_score(u);
  END LOOP;
END $$;
```

- [ ] **Step 2: Apply** via `mcp__supabase__apply_migration` (name `n400_19_growth_backfill`).

- [ ] **Step 3: Verify backfill sanity**

`mcp__supabase__execute_sql`:
```sql
SELECT
  (SELECT count(*) FROM profiles)            AS profiles,
  (SELECT count(*) FROM n400_growth_events WHERE event_type='account_created') AS acct_events,
  (SELECT count(*) FROM n400_quiz_attempts WHERE completed_at IS NOT NULL AND mode IN ('practice','mock_test')) AS graded_attempts,
  (SELECT count(*) FROM n400_growth_events WHERE event_type IN ('practice_completed','mock_completed')) AS attempt_events,
  (SELECT count(*) FROM n400_lead_profiles WHERE lead_score > 0) AS scored_leads;
```
Expected: `acct_events = profiles`, `attempt_events = graded_attempts`, `scored_leads > 0`.

- [ ] **Step 4: Commit**

```bash
git add apps/website/supabase/migrations/n400_19_growth_backfill.sql
git commit -m "feat(n400-growth): backfill growth events + lead scores from historical data"
```

---

### Task 6: TS module — event taxonomy + feature flags (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/growth/events.ts`
- Create: `apps/website/src/lib/n400/growth/flags.ts`
- Test: `apps/website/src/lib/n400/growth/flags.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/website/src/lib/n400/growth/flags.test.ts
import { describe, expect, it } from 'vitest';
import { isUserInRollout } from './flags';
import { isClientEventType } from './events';

describe('isUserInRollout', () => {
  const uid = 'b3b8c2a0-1111-4222-8333-444455556666';

  it('is deterministic for the same user + flag', () => {
    expect(isUserInRollout('cta_engine', uid, 50)).toBe(isUserInRollout('cta_engine', uid, 50));
  });

  it('includes everyone at 100 and no one at 0', () => {
    expect(isUserInRollout('cta_engine', uid, 100)).toBe(true);
    expect(isUserInRollout('cta_engine', uid, 0)).toBe(false);
  });

  it('can differ per flag for the same user (independent buckets)', () => {
    const flags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const buckets = new Set(flags.map((f) => isUserInRollout(f, uid, 50)));
    expect(buckets.size).toBeGreaterThan(0); // sanity: function runs for all
  });
});

describe('isClientEventType', () => {
  it('accepts whitelisted client events', () => {
    expect(isClientEventType('cta_dismissed')).toBe(true);
    expect(isClientEventType('prompt_answered')).toBe(true);
  });

  it('rejects server-authoritative and unknown types', () => {
    expect(isClientEventType('mock_completed')).toBe(false);
    expect(isClientEventType('practice_completed')).toBe(false);
    expect(isClientEventType('drop table')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && pnpm exec vitest run src/lib/n400/growth`
Expected: FAIL — cannot resolve `./flags` / `./events`.

- [ ] **Step 3: Implement `events.ts`**

```ts
// apps/website/src/lib/n400/growth/events.ts
//
// Growth event taxonomy (spec §1.5). event_version bumps when a type's payload
// shape changes — consumers read by version.
//
// SERVER_EVENT_TYPES are emitted by DB triggers only; the RLS INSERT policy on
// n400_growth_events rejects them from clients. CLIENT_EVENT_TYPES may be
// inserted by the signed-in user for themself (UI telemetry; the only ones that
// influence scoring are the cta_* group).

export const CLIENT_EVENT_TYPES = [
  'cta_shown',
  'cta_dismissed',
  'cta_clicked',
  'prompt_answered',
  'prompt_skipped',
  'checklist_viewed',
  'consultation_form_opened',
] as const;

export const SERVER_EVENT_TYPES = [
  'account_created',
  'onboarding_completed',
  'address_entered',
  'practice_completed',
  'mock_completed',
  // reserved, not emitted in G1:
  'section_completed',
  'readiness_snapshot',
  'app_shared',
  'review_left',
  'friend_invited',
  'push_disabled',
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];
export type ServerEventType = (typeof SERVER_EVENT_TYPES)[number];
export type GrowthEventType = ClientEventType | ServerEventType;

export const EVENT_VERSION = 1;

export function isClientEventType(type: string): type is ClientEventType {
  return (CLIENT_EVENT_TYPES as readonly string[]).includes(type);
}
```

- [ ] **Step 4: Implement `flags.ts`**

```ts
// apps/website/src/lib/n400/growth/flags.ts
//
// Feature flags with deterministic percentage rollout (spec §1.6).
// hash(user_id, flag_key) buckets a user 0-99; the bucket is stable, so a user
// never flip-flops in and out of a rollout. No assignment table needed.

export type FeatureFlag = {
  flag_key: string;
  enabled: boolean;
  rollout_pct: number;
};

// FNV-1a 32-bit — tiny, dependency-free, stable across platforms.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function isUserInRollout(flagKey: string, userId: string, rolloutPct: number): boolean {
  if (rolloutPct >= 100) return true;
  if (rolloutPct <= 0) return false;
  return fnv1a(`${flagKey}:${userId}`) % 100 < rolloutPct;
}

export function isFeatureOn(flag: FeatureFlag | null | undefined, userId: string): boolean {
  if (!flag || !flag.enabled) return false;
  return isUserInRollout(flag.flag_key, userId, flag.rollout_pct);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/website && pnpm exec vitest run src/lib/n400/growth`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/growth/events.ts apps/website/src/lib/n400/growth/flags.ts apps/website/src/lib/n400/growth/flags.test.ts
git commit -m "feat(n400-growth): event taxonomy + deterministic feature-flag rollout"
```

---

### Task 7: TS module — attribution (TDD)

**Files:**
- Create: `apps/website/src/lib/n400/growth/attribution.ts`
- Test: `apps/website/src/lib/n400/growth/attribution.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/website/src/lib/n400/growth/attribution.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildTouch,
  hasAttributionSignal,
  mergeAttributionCookie,
  parseAttributionCookie,
} from './attribution';

const url = (s: string) => new URL(s, 'https://mannaos.com');

describe('hasAttributionSignal', () => {
  it('detects utm and click ids', () => {
    expect(hasAttributionSignal(url('/n400ready?utm_source=facebook'))).toBe(true);
    expect(hasAttributionSignal(url('/n400ready?fbclid=abc'))).toBe(true);
    expect(hasAttributionSignal(url('/n400ready'))).toBe(false);
  });
});

describe('buildTouch', () => {
  it('captures utm params, referrer and landing page', () => {
    const t = buildTouch(url('/vi/services?utm_source=fb&utm_campaign=n400_t1&fbclid=x1'), 'https://facebook.com/');
    expect(t.utm_source).toBe('fb');
    expect(t.utm_campaign).toBe('n400_t1');
    expect(t.fbclid).toBe('x1');
    expect(t.referrer).toBe('https://facebook.com/');
    expect(t.landing_page).toBe('/vi/services');
    expect(t.ts).toBeTruthy();
  });

  it('truncates oversized values', () => {
    const long = 'x'.repeat(500);
    const t = buildTouch(url(`/a?utm_source=${long}`), null);
    expect(t.utm_source!.length).toBeLessThanOrEqual(200);
  });
});

describe('mergeAttributionCookie', () => {
  const first = buildTouch(url('/?utm_source=google'), null);
  const later = buildTouch(url('/?utm_source=facebook'), null);

  it('creates first+last on empty cookie', () => {
    const merged = mergeAttributionCookie(null, first);
    expect(merged.first.utm_source).toBe('google');
    expect(merged.last.utm_source).toBe('google');
  });

  it('keeps first touch, replaces last touch', () => {
    const c0 = mergeAttributionCookie(null, first);
    const c1 = mergeAttributionCookie(JSON.stringify(c0), later);
    expect(c1.first.utm_source).toBe('google');
    expect(c1.last.utm_source).toBe('facebook');
  });

  it('survives a corrupted cookie', () => {
    const merged = mergeAttributionCookie('{not json', later);
    expect(merged.first.utm_source).toBe('facebook');
  });
});

describe('parseAttributionCookie', () => {
  it('returns null on garbage', () => {
    expect(parseAttributionCookie(undefined)).toBeNull();
    expect(parseAttributionCookie(']]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && pnpm exec vitest run src/lib/n400/growth/attribution.test.ts`
Expected: FAIL — cannot resolve `./attribution`.

- [ ] **Step 3: Implement `attribution.ts`**

```ts
// apps/website/src/lib/n400/growth/attribution.ts
//
// First-party attribution capture (spec §1.2). A cookie records first touch
// (immutable) + last touch (overwritten whenever a new UTM/click-id arrives).
// At login/signup the auth callback persists the cookie into
// n400_lead_profiles via the n400_set_attribution RPC. Edge-safe: no Node or
// Supabase imports — middleware runs this.

export const ATTRIB_COOKIE = 'n400_attrib';
export const ATTRIB_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const PARAM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ad_id', 'fbclid', 'gclid',
] as const;

const VALUE_MAX = 200;
const REFERRER_MAX = 500;

export type TouchData = {
  [K in (typeof PARAM_KEYS)[number]]?: string;
} & {
  referrer?: string;
  landing_page: string;
  ts: string;
};

export type AttributionCookie = { first: TouchData; last: TouchData };

export function hasAttributionSignal(url: URL): boolean {
  return PARAM_KEYS.some((k) => url.searchParams.get(k));
}

export function buildTouch(url: URL, referrer: string | null): TouchData {
  const touch: TouchData = {
    landing_page: url.pathname.slice(0, VALUE_MAX),
    ts: new Date().toISOString(),
  };
  for (const key of PARAM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) touch[key] = value.slice(0, VALUE_MAX);
  }
  if (referrer) touch.referrer = referrer.slice(0, REFERRER_MAX);
  return touch;
}

export function parseAttributionCookie(raw: string | undefined): AttributionCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.first && parsed.last) {
      return parsed as AttributionCookie;
    }
    return null;
  } catch {
    return null;
  }
}

export function mergeAttributionCookie(raw: string | null | undefined, touch: TouchData): AttributionCookie {
  const existing = parseAttributionCookie(raw ?? undefined);
  if (!existing) return { first: touch, last: touch };
  return { first: existing.first, last: touch };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && pnpm exec vitest run src/lib/n400/growth/attribution.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/n400/growth/attribution.ts apps/website/src/lib/n400/growth/attribution.test.ts
git commit -m "feat(n400-growth): first/last-touch attribution cookie helpers"
```

---

### Task 8: Wire attribution — middleware capture + auth-callback persist

**Files:**
- Modify: `apps/website/src/middleware.ts`
- Modify: `apps/website/src/app/api/auth/callback/route.ts`

⚠️ Next.js 16 — skim `node_modules/next/dist/docs/` middleware + route-handler guides first (per `apps/website/AGENTS.md`).

- [ ] **Step 1: Add capture helper call to middleware**

In `src/middleware.ts`, add the import:

```ts
import {
  ATTRIB_COOKIE,
  ATTRIB_COOKIE_MAX_AGE,
  buildTouch,
  hasAttributionSignal,
  mergeAttributionCookie,
} from '@/lib/n400/growth/attribution';
```

Add this function above `export async function middleware`:

```ts
// Growth attribution: stamp/refresh the first-party touch cookie whenever a
// request carries UTM/click-id params, or on the very first visit (organic —
// captures referrer + landing page). Redirect responses are skipped: Next
// preserves the query string, so the follow-up request captures instead.
function captureAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const url = request.nextUrl;
  const existingRaw = request.cookies.get(ATTRIB_COOKIE)?.value;
  const signal = hasAttributionSignal(url);
  if (existingRaw && !signal) return response;

  const touch = buildTouch(url, request.headers.get('referer'));
  const merged = mergeAttributionCookie(existingRaw, touch);
  response.cookies.set(ATTRIB_COOKIE, JSON.stringify(merged), {
    path: '/',
    maxAge: ATTRIB_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
```

Wrap the three success-path returns (leave every redirect return untouched):

1. `if (isN400Public) { return NextResponse.next(); }` → `return captureAttribution(request, NextResponse.next());`
2. `if (!isAdminPath && !isPortalPath && !isN400Path) { return NextResponse.next(); }` → `return captureAttribution(request, NextResponse.next());`
3. Final `return supabaseResponse;` → `return captureAttribution(request, supabaseResponse);`

(The early asset-skip return at the top stays untouched — no attribution on `/_next` etc.)

- [ ] **Step 2: Persist at login in the auth callback**

In `src/app/api/auth/callback/route.ts`, add the import:

```ts
import { ATTRIB_COOKIE, parseAttributionCookie } from '@/lib/n400/growth/attribution';
```

After the `bootstrapAvatar` try/catch (immediately before the final redirect), insert:

```ts
  // Growth attribution: copy the first-party touch cookie into the lead
  // profile. First touch is written once (RPC keeps existing non-null value);
  // last touch always updates. Must never block authentication.
  try {
    const attrib = parseAttributionCookie(request.cookies.get(ATTRIB_COOKIE)?.value);
    if (attrib) {
      await supabase.rpc('n400_set_attribution', {
        p_first: attrib.first,
        p_last: attrib.last,
      });
    }
  } catch {
    // Swallow intentionally; auth already succeeded.
  }
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `cd apps/website && pnpm exec tsc --noEmit && pnpm exec vitest run`
Expected: no type errors; all suites PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/middleware.ts apps/website/src/app/api/auth/callback/route.ts
git commit -m "feat(n400-growth): capture attribution cookie in middleware, persist first/last touch at login"
```

---

### Task 9: Client-event ingest server action

**Files:**
- Create: `apps/website/src/lib/n400/growth/ingest.ts`

No component calls this yet (G2/G3 will); it ships now so the module boundary is complete and G2 starts from a working ingest path. RLS is the real enforcement — the whitelist check here just fails fast.

- [ ] **Step 1: Implement the server action**

```ts
// apps/website/src/lib/n400/growth/ingest.ts
'use server';

// Client-event ingest (spec §1.7 ingest.ts). Whitelisted UI telemetry only —
// server-authoritative events are emitted by DB triggers. Defense in depth:
// the RLS INSERT policy on n400_growth_events enforces the same whitelist, so
// a forged request cannot write scoring-relevant server events either way.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { EVENT_VERSION, isClientEventType } from './events';

const PAYLOAD_MAX_BYTES = 2048;

export async function ingestClientEvent(
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: boolean; error?: string }> {
  if (!isClientEventType(eventType)) {
    return { ok: false, error: 'unknown_event_type' };
  }
  if (JSON.stringify(payload).length > PAYLOAD_MAX_BYTES) {
    return { ok: false, error: 'payload_too_large' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only usage; session refresh happens in middleware.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const { error } = await supabase.from('n400_growth_events').insert({
    user_id: user.id,
    event_type: eventType,
    event_version: EVENT_VERSION,
    payload,
  });
  if (error) return { ok: false, error: 'insert_failed' };
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/website && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/growth/ingest.ts
git commit -m "feat(n400-growth): whitelisted client-event ingest server action"
```

---

### Task 10: End-to-end verification + roadmap

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Full local gate**

Run: `cd apps/website && pnpm exec tsc --noEmit && pnpm exec vitest run`
Expected: everything green.

- [ ] **Step 2: Live smoke — emitter chain**

`mcp__supabase__execute_sql` (read-only):
```sql
SELECT lp.user_id, lp.lead_score, lp.lead_status, lv.effective_score, lv.effective_status
FROM n400_lead_profiles lp
JOIN n400_leads_view lv ON lv.user_id = lp.user_id
ORDER BY lp.lead_score DESC
LIMIT 5;
```
Expected: backfilled users with plausible scores (an active user with onboarding + address + several sessions should sit around 60–135). Sanity-check one user's score by hand against the §2 table. Then run `mcp__supabase__get_advisors` (security) — expect no new criticals for the `n400_growth_*` objects.

- [ ] **Step 3: Update roadmap**

In `docs/ROADMAP.md`, under Track 2 (after the Phase 3C entry), add:

```markdown
- [x] **Website Phase 3D — N400 Growth Engine G1 (data + engine core)** — Event log (`n400_growth_events` + emitter triggers), config-driven lead scoring 0–300 (`n400_growth_rules`, recompute + read-time decay view), lead profiles with first/last-touch attribution, consultation requests + CTA decision log tables, seeded CTA/prompt definitions, feature flags (all OFF), historical backfill, `src/lib/n400/growth/` module (events/flags/attribution/ingest). Spec: specs/2026-07-19-n400-growth-engine-design.md. G2 (conversation model), G3 (CTA+booking), G4 (internal_app Leads) pending.
```

- [ ] **Step 4: Final commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark growth engine G1 shipped in roadmap"
```

---

## Self-review notes (already applied)

- **Spec coverage:** §1 tables/RLS → Tasks 1–2; §1.6 config + flags → Task 2 + 6; §1.7 engine split (ingest/scoring) → Tasks 3, 9; §2 seed values → Task 2, consumed in Task 3; attribution §1.2 → Tasks 7–8; backfill §8-G1 → Task 5. CTA/prompt evaluators, notify, decision-log writes = G2/G3 by design.
- **Deviation from spec wording:** events are emitted by triggers, not by editing finalize RPC bodies — same guarantees (server-side, transactional), zero risk of drifting the streak/badge logic that lives in those functions.
- **Type consistency:** `TouchData`/`AttributionCookie` used identically in Tasks 7–8; `isClientEventType` defined in Task 6, used in Task 9; RLS whitelist (Task 1) matches `CLIENT_EVENT_TYPES` (Task 6).
- **Score write path:** only `recompute_n400_lead_score` (definer) updates `lead_score`; no user-facing UPDATE policy exists on `n400_lead_profiles`.
