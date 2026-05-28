-- N400 Civics Test App — Phase 6B: Gamification & Badges
-- Spec: docs/superpowers/specs/2026-05-24-n400-gamification-design.md
-- Applied via Supabase MCP apply_migration

-- ── New tables ─────────────────────────────────────────────────────────────

-- Catalog of available badges. Admin-managed, but ships with a seeded set
-- of 24 rows below. INSERT/UPDATE/DELETE restricted to profiles.role='admin'
-- (matches the existing pattern from n400_01_tables.sql).
CREATE TABLE IF NOT EXISTS public.n400_badges (
  slug            TEXT PRIMARY KEY,
  title_en        TEXT NOT NULL,
  title_vi        TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  description_vi  TEXT NOT NULL,
  group_code      TEXT NOT NULL CHECK (group_code IN ('streak','mock','coverage','volume','category')),
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User achievements. Append-only ledger; (user_id, slug) PK gives DB-level
-- idempotency so re-running an evaluator on the same data is a no-op.
CREATE TABLE IF NOT EXISTS public.n400_user_badges (
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL REFERENCES public.n400_badges(slug) ON DELETE CASCADE,
  unlocked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_attempt_id  UUID REFERENCES public.n400_quiz_attempts(id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX IF NOT EXISTS n400_user_badges_user_idx
  ON public.n400_user_badges(user_id, unlocked_at DESC);

-- Category code so the evaluator can group questions reliably without
-- depending on the free-form `category` text. Backfilled below from the
-- USCIS-aligned section labels seeded into n400_questions.category:
--   'Principles of American Democracy' → A
--   'System of Government'             → B
--   'Rights and Responsibilities'      → C
--   'American History'                 → D
--   'Symbols and Holidays'             → E
ALTER TABLE public.n400_questions
  ADD COLUMN IF NOT EXISTS category_code TEXT
    CHECK (category_code IN ('A','B','C','D','E'));

CREATE INDEX IF NOT EXISTS n400_questions_category_code_idx
  ON public.n400_questions(category_code);

UPDATE public.n400_questions SET category_code = CASE category
  WHEN 'Principles of American Democracy' THEN 'A'
  WHEN 'System of Government'             THEN 'B'
  WHEN 'Rights and Responsibilities'      THEN 'C'
  WHEN 'American History'                 THEN 'D'
  WHEN 'Symbols and Holidays'             THEN 'E'
  ELSE category_code
END
WHERE category_code IS NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.n400_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS n400_badges_read_all   ON public.n400_badges;
DROP POLICY IF EXISTS n400_badges_admin_write ON public.n400_badges;

CREATE POLICY n400_badges_read_all
  ON public.n400_badges FOR SELECT
  USING (TRUE);

CREATE POLICY n400_badges_admin_write
  ON public.n400_badges FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS n400_user_badges_read_own   ON public.n400_user_badges;
DROP POLICY IF EXISTS n400_user_badges_admin_read ON public.n400_user_badges;

-- Read own; admins read everyone. Inserts go through server-side RPC using
-- service_role, so no INSERT policy is required.
CREATE POLICY n400_user_badges_read_own
  ON public.n400_user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY n400_user_badges_admin_read
  ON public.n400_user_badges FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Seed catalog (24 badges) ───────────────────────────────────────────────
-- Slugs match the filenames at apps/website/public/images/n400/badges/<slug>.png

INSERT INTO public.n400_badges
  (slug, title_en, title_vi, description_en, description_vi, group_code, sort_order)
VALUES
  -- Group A — Streak (6)
  ('streak-3',                 '3-day streak',           '3 ngày liên tiếp',                   'Study 3 days in a row',                                    'Học 3 ngày liên tiếp',                                                  'streak',   10),
  ('streak-7',                 '7-day streak',           '7 ngày liên tiếp',                   'Study 7 days in a row',                                    'Học 7 ngày liên tiếp',                                                  'streak',   20),
  ('streak-14',                '14-day streak',          '14 ngày liên tiếp',                  'Study 14 days in a row',                                   'Học 14 ngày liên tiếp',                                                 'streak',   30),
  ('streak-30',                '30-day streak',          '30 ngày liên tiếp',                  'Study 30 days in a row',                                   'Học 30 ngày liên tiếp',                                                 'streak',   40),
  ('streak-60',                '60-day streak',          '60 ngày liên tiếp',                  'Study 60 days in a row',                                   'Học 60 ngày liên tiếp',                                                 'streak',   50),
  ('streak-100',               '100-day streak',         '100 ngày liên tiếp',                 'Study 100 days in a row',                                  'Học 100 ngày liên tiếp',                                                'streak',   60),

  -- Group B — Mock Test Performance (6)
  ('onboarding-first-session', 'First step',             'Khởi đầu hành trình',                'Complete your first study session',                        'Hoàn thành buổi học đầu tiên',                                          'mock',    100),
  ('mock-pass-first',          'Test ready',             'Sẵn sàng thi',                       'Pass your first mock test',                                'Đạt bài thi thử đầu tiên',                                              'mock',    110),
  ('mock-pass-five',           'Future citizen',         'Công dân tương lai',                 'Pass 5 mock tests',                                        'Đạt 5 bài thi thử',                                                     'mock',    120),
  ('mock-high-score',          'High Score',             'High Score',                         'Score 18 or more on a mock test',                          'Đạt 18+/20 trong một bài thi thử',                                      'mock',    130),
  ('mock-perfect',             'Perfect run',            'Xuất sắc',                           'Pass a mock test with zero wrong answers',                 'Đạt thi thử mà không trả lời sai câu nào',                              'mock',    140),
  ('mock-comeback',            'Comeback',               'Bứt phá',                            'Pass a mock test after at least one prior failure',        'Đạt thi thử sau khi đã có lần chưa đạt',                                'mock',    150),

  -- Group C — Coverage & Mastery (4)
  ('correct-answers-100',      '100 correct answers',    '100 câu đúng',                       'Answer 100 questions correctly',                           'Trả lời đúng 100 câu',                                                  'coverage', 200),
  ('flashcards-mastery',       'Deep mastery',           'Hiểu sâu nhớ lâu',                   'Mark 100 distinct questions as known on flashcards',       'Đánh dấu "Đã thuộc" 100 câu khác nhau',                                 'coverage', 210),
  ('all-128-answered',         'Liberty Bell',           'Tiếng chuông tự do',                 'Attempt every one of the 128 official questions',          'Đã trả lời tất cả 128 câu chính thức',                                  'coverage', 220),
  ('sessions-100',             'Century',                'Cột mốc 100',                        'Complete 100 study sessions',                              'Hoàn thành 100 buổi học',                                               'coverage', 230),

  -- Group D — Volume / Persistence (3)
  ('practice-sessions-10',     'Diligent',               'Học tập chăm chỉ',                   'Complete 10 practice sessions',                            'Hoàn thành 10 buổi luyện tập',                                          'volume',   300),
  ('practice-sessions-30',     'Focused daily',          'Tập trung mỗi ngày',                 'Complete 30 practice sessions',                            'Hoàn thành 30 buổi luyện tập',                                          'volume',   310),
  ('sessions-50',              'Persistent',             'Kiên trì bền bỉ',                    'Complete 50 study sessions',                               'Hoàn thành 50 buổi học',                                                'volume',   320),

  -- Group E — Category Mastery (5)
  ('category-democracy',       'Democracy',              'Khởi đầu tự do',                     'Master 80%+ of Democracy category questions',              'Thuộc 80%+ câu hỏi nhóm Dân chủ',                                       'category', 400),
  ('category-government',      'Constitutionalist',      'Nhà hiến pháp',                      'Master 80%+ of Government category questions',             'Thuộc 80%+ câu hỏi nhóm Hệ thống chính phủ',                            'category', 410),
  ('category-rights',          'Justice & Rights',       'Công lý & Quyền',                    'Master 80%+ of Rights category questions',                 'Thuộc 80%+ câu hỏi nhóm Quyền & Trách nhiệm',                           'category', 420),
  ('category-history',         'Patriot',                'Yêu nước Mỹ',                        'Master 80%+ of American History category questions',       'Thuộc 80%+ câu hỏi nhóm Lịch sử Mỹ',                                    'category', 430),
  ('category-symbols',         'Symbols & Community',    'Tự nhiên & Cộng đồng',               'Master 80%+ of Symbols category questions',                'Thuộc 80%+ câu hỏi nhóm Biểu tượng & Ngày lễ',                          'category', 440)
ON CONFLICT (slug) DO NOTHING;
