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
  ('mock_tests_5',              30, '{"min_count": 5}'),
  ('mock_avg_above_90',         30, '{"min_avg_pct": 90, "min_mocks": 1}'),
  ('interview_scheduled',       60, '{}'),
  ('files_within_30d',          40, '{}'),
  ('consultation_requested',    60, '{}'),
  ('consultation_booked',      100, '{}'),
  ('consultation_done',        120, '{}'),
  ('inactive_14d',             -30, '{"days": 14}'),
  ('inactive_30d',             -60, '{"days": 30}'),
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
