-- N400 Civics Test App — Gamification v2: full badge replacement (56 badges).
-- Spec: docs/superpowers/plans/2026-07-07-n400-expansion-4-gamification.md
--
-- Replaces the Phase 6B 24-badge civics-only catalog with a 56-badge set
-- spanning all 4 study sections (Civics, Writing, Yes/No, What Mean) plus
-- cross-section combo/practice/misc/secret achievements. Deleting the old
-- catalog rows cascades to n400_user_badges (FK ON DELETE CASCADE), so
-- every user's previously earned badges are cleared along with the old
-- catalog — this is an intentional full reset, not an additive migration.

-- ── Catalog schema changes ──────────────────────────────────────────────────

ALTER TABLE public.n400_badges
  ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT FALSE;

-- Full reset: delete every existing catalog row (must happen before the
-- constraint is widened, since old group_code values like 'mock'/'coverage'
-- would violate the new CHECK). FK ON DELETE CASCADE on n400_user_badges.slug
-- clears all previously earned badges too.
DELETE FROM public.n400_badges;

ALTER TABLE public.n400_badges DROP CONSTRAINT IF EXISTS n400_badges_group_code_check;
ALTER TABLE public.n400_badges
  ADD CONSTRAINT n400_badges_group_code_check
  CHECK (group_code IN ('streak','civics','writing','yesno','whatmean','combo','practice','other','secret'));

-- ── New table: writing/speaking mock test results ───────────────────────────
-- Civics mock tests already persist to n400_quiz_attempts (mode='mock_test').
-- The Writing and Speaking mock tests (Plan 3) are client-only today — this
-- table gives them a durable, queryable pass/fail record so badges like
-- "Interview Master" (pass all 3 mock types) and "Mock Champion" can read a
-- consistent source across all three mock tests.
CREATE TABLE IF NOT EXISTS public.n400_section_mock_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section       TEXT NOT NULL CHECK (section IN ('writing', 'speaking')),
  passed        BOOLEAN NOT NULL,
  score         INT NOT NULL,
  total         INT NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_n400_section_mock_results_user
  ON public.n400_section_mock_results(user_id, completed_at);

ALTER TABLE public.n400_section_mock_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n400 section mock results own" ON public.n400_section_mock_results FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "n400 section mock results admin read" ON public.n400_section_mock_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Seed catalog (56 badges) ─────────────────────────────────────────────────
-- Slugs match filenames at apps/website/public/images/n400/badges/<slug>.png
-- (copied + renamed from public/images/n400/New badges/).

INSERT INTO public.n400_badges
  (slug, title_en, title_vi, description_en, description_vi, group_code, sort_order, is_secret)
VALUES
  -- Group: Streak (6) — unchanged from Phase 6B
  ('streak-3',   '3-Day Streak',   '3 ngày liên tiếp',   'Study 3 days in a row',   'Học 3 ngày liên tiếp',   'streak', 10, FALSE),
  ('streak-7',   '7-Day Streak',   '7 ngày liên tiếp',   'Study 7 days in a row',   'Học 7 ngày liên tiếp',   'streak', 20, FALSE),
  ('streak-14',  '14-Day Streak',  '14 ngày liên tiếp',  'Study 14 days in a row',  'Học 14 ngày liên tiếp',  'streak', 30, FALSE),
  ('streak-30',  '30-Day Streak',  '30 ngày liên tiếp',  'Study 30 days in a row',  'Học 30 ngày liên tiếp',  'streak', 40, FALSE),
  ('streak-60',  '60-Day Streak',  '60 ngày liên tiếp',  'Study 60 days in a row',  'Học 60 ngày liên tiếp',  'streak', 50, FALSE),
  ('streak-100', '100-Day Streak', '100 ngày liên tiếp', 'Study 100 days in a row', 'Học 100 ngày liên tiếp', 'streak', 60, FALSE),

  -- Group: Civics progress (6)
  ('civics-first', 'Freedom Begins',    'Khởi đầu tự do',      'Answer your first civics question',  'Trả lời câu hỏi Civics đầu tiên',      'civics', 100, FALSE),
  ('civics-10',    'Study Habit',       'Thói quen học tập',   'Answer 10 civics questions',         'Trả lời 10 câu hỏi Civics',            'civics', 110, FALSE),
  ('civics-30',    'Keep Going',        'Tiếp tục cố gắng',    'Answer 30 civics questions',         'Trả lời 30 câu hỏi Civics',            'civics', 120, FALSE),
  ('civics-50',    'American Spirit',   'Tinh thần nước Mỹ',   'Answer 50 civics questions',         'Trả lời 50 câu hỏi Civics',            'civics', 130, FALSE),
  ('civics-100',   'Century Milestone', 'Cột mốc trăm câu',    'Answer 100 civics questions',        'Trả lời 100 câu hỏi Civics',           'civics', 140, FALSE),
  ('civics-128',   'Civics Champion',   'Nhà vô địch Civics',  'Answer all 128 civics questions',    'Trả lời hết 128 câu hỏi Civics',       'civics', 150, FALSE),

  -- Group: Writing (6)
  ('writing-first',   'First Sentence',  'Câu viết đầu tiên', 'Complete your first writing sentence',          'Hoàn thành câu viết đầu tiên',                  'writing', 200, FALSE),
  ('writing-10',       'Young Writer',    'Người viết trẻ',    'Complete 10 writing sentences',                 'Hoàn thành 10 câu viết',                        'writing', 210, FALSE),
  ('writing-20',       'Sentence Builder','Xây dựng câu văn',  'Complete 20 writing sentences',                 'Hoàn thành 20 câu viết',                        'writing', 220, FALSE),
  ('writing-35',       'Skilled Writer',  'Người viết giỏi',   'Complete 35 writing sentences',                 'Hoàn thành 35 câu viết',                        'writing', 230, FALSE),
  ('writing-45',       'Writing Master',  'Bậc thầy viết',     'Complete all 45 writing sentences',             'Hoàn thành hết 45 câu viết',                    'writing', 240, FALSE),
  ('writing-perfect',  'Perfect Writer',  'Viết hoàn hảo',     'Complete all 45 sentences with ≥95% accuracy',  'Hoàn thành 45 câu với độ chính xác từ 95%',     'writing', 250, FALSE),

  -- Group: Yes/No (6)
  ('yesno-first',   'First Answer',      'Câu trả lời đầu tiên', 'Answer your first Yes/No question',        'Trả lời câu Yes/No đầu tiên',                'yesno', 300, FALSE),
  ('yesno-10',      'Quick Responder',   'Phản xạ nhanh',        'Answer 10 Yes/No questions',               'Trả lời 10 câu Yes/No',                      'yesno', 310, FALSE),
  ('yesno-20',      'Confident Speaker', 'Tự tin trả lời',       'Answer 20 Yes/No questions',               'Trả lời 20 câu Yes/No',                      'yesno', 320, FALSE),
  ('yesno-30',      'Rapid Response',    'Phản hồi tức thì',     'Answer 30 Yes/No questions',               'Trả lời 30 câu Yes/No',                      'yesno', 330, FALSE),
  ('yesno-37',      'Yes No Master',     'Bậc thầy Yes/No',      'Answer all 37 Yes/No questions',           'Trả lời hết 37 câu Yes/No',                  'yesno', 340, FALSE),
  ('yesno-perfect', 'Perfect Response',  'Trả lời hoàn hảo',     'Answer all 37 questions with ≥95% accuracy','Trả lời 37 câu với độ chính xác từ 95%',     'yesno', 350, FALSE),

  -- Group: What Mean (6)
  ('whatmean-first',   'Meaning Explorer',   'Khám phá ý nghĩa',    'Answer your first What Mean question',       'Trả lời câu What Mean đầu tiên',            'whatmean', 400, FALSE),
  ('whatmean-15',      'Word Learner',       'Học từ vựng',         'Answer 15 What Mean questions',              'Trả lời 15 câu What Mean',                  'whatmean', 410, FALSE),
  ('whatmean-30',      'Vocabulary Builder', 'Xây dựng vốn từ',     'Answer 30 What Mean questions',              'Trả lời 30 câu What Mean',                  'whatmean', 420, FALSE),
  ('whatmean-45',      'Meaning Expert',     'Chuyên gia ý nghĩa',  'Answer 45 What Mean questions',              'Trả lời 45 câu What Mean',                  'whatmean', 430, FALSE),
  ('whatmean-62',      'Meaning Master',     'Bậc thầy ý nghĩa',    'Answer all 62 What Mean questions',          'Trả lời hết 62 câu What Mean',              'whatmean', 440, FALSE),
  ('whatmean-perfect', 'Vocabulary Genius',  'Thiên tài từ vựng',   'Answer all 62 questions with ≥95% accuracy', 'Trả lời 62 câu với độ chính xác từ 95%',    'whatmean', 450, FALSE),

  -- Group: Combo achievements (5)
  ('combo-starter',          'Communication Starter',  'Bắt đầu giao tiếp',    'Writing 10 + Yes/No 10 + What Mean 15',              'Viết 10 + Yes/No 10 + What Mean 15',                       'combo', 500, FALSE),
  ('combo-explorer',         'Communication Explorer', 'Khám phá giao tiếp',   'Writing 20 + Yes/No 20 + What Mean 30',              'Viết 20 + Yes/No 20 + What Mean 30',                       'combo', 510, FALSE),
  ('combo-interview-ready',  'Interview Ready',        'Sẵn sàng phỏng vấn',   'Start all 4 sections (Civics, Writing, Yes/No, What Mean)', 'Bắt đầu cả 4 phần: Civics, Viết, Yes/No, What Mean', 'combo', 520, FALSE),
  ('combo-language-champion','Language Champion',      'Nhà vô địch ngôn ngữ', 'Complete all 4 sections with ≥90% accuracy each',    'Hoàn thành cả 4 phần với độ chính xác từ 90%',             'combo', 530, FALSE),
  ('combo-interview-master', 'Interview Master',       'Bậc thầy phỏng vấn',   'Pass all 3 mock tests: Civics, Writing, Speaking',   'Đạt cả 3 bài thi thử: Civics, Viết, Speaking',             'combo', 540, FALSE),

  -- Group: Practice achievements (8)
  ('practice-exam-ready',       'Exam Ready',         'Sẵn sàng thi',           'Pass your first Civics mock test',       'Đạt bài thi thử Civics đầu tiên',           'practice', 600, FALSE),
  ('practice-future-citizen',   'Future Citizen',     'Công dân tương lai',     'Score ≥90% on a Civics mock test',       'Đạt từ 90% trong bài thi thử Civics',       'practice', 610, FALSE),
  ('practice-high-score',       'High Score',         'Điểm số cao',            'Score ≥90% in one practice session',     'Đạt từ 90% trong một buổi luyện tập',       'practice', 620, FALSE),
  ('practice-excellence',       'Excellence',         'Xuất sắc',               'Score ≥90% in 10 practice sessions',     'Đạt từ 90% trong 10 buổi luyện tập',        'practice', 630, FALSE),
  ('practice-perfect-accuracy', 'Perfect Accuracy',   'Độ chính xác hoàn hảo',  '100 correct answers in a row',           '100 câu đúng liên tiếp',                    'practice', 640, FALSE),
  ('practice-perfect-streak',   'Perfect Streak',     'Chuỗi hoàn hảo',         '50 correct answers in a row',            '50 câu đúng liên tiếp',                     'practice', 650, FALSE),
  ('practice-perfect-round',    'Perfect Round',      'Vòng hoàn hảo',          'Perfect score (100%) in one session',    'Đạt điểm tuyệt đối 100% trong một buổi',    'practice', 660, FALSE),
  ('practice-mock-champion',    'Mock Champion',      'Vô địch thi thử',        'Pass 10 mock tests (any type)',          'Đạt 10 bài thi thử (bất kỳ loại nào)',      'practice', 670, FALSE),

  -- Group: Other achievements (8)
  ('other-first-practice',     'First Practice',        'Buổi luyện đầu tiên',   'Complete your first practice session',              'Hoàn thành buổi luyện tập đầu tiên',              'other', 700, FALSE),
  ('other-mock-rookie',        'Mock Rookie',            'Tân binh thi thử',      'Complete your first mock test',                     'Hoàn thành bài thi thử đầu tiên',                 'other', 710, FALSE),
  ('other-test-veteran',       'Test Veteran',           'Cựu chiến binh thi cử', 'Complete 50 mock tests',                            'Hoàn thành 50 bài thi thử',                       'other', 720, FALSE),
  ('other-comeback',           'Comeback',               'Trở lại mạnh mẽ',       'Pass a Civics mock test after a prior failure',     'Đạt thi thử Civics sau khi từng chưa đạt',        'other', 730, FALSE),
  ('other-long-term-memory',   'Long-term Memory',       'Trí nhớ bền vững',      '50 correct answers on previously bookmarked questions', '50 câu đúng trong các câu đã đánh dấu',       'other', 740, FALSE),
  ('other-consistent-performer','Consistent Performer',  'Người kiên trì',        'Study 30 consecutive days',                         'Học 30 ngày liên tiếp không nghỉ',                'other', 750, FALSE),
  ('other-memory-master',      'Memory Master',          'Bậc thầy trí nhớ',      'Master ≥90% of one section',                        'Thuộc từ 90% một phần học',                       'other', 760, FALSE),
  ('other-ultimate',           'Ultimate Badge',         'Huy hiệu tối thượng',   'Complete every section and pass all mock tests',    'Hoàn thành mọi phần học và đạt tất cả bài thi thử','other', 770, FALSE),

  -- Group: Secret (5) — hidden (name/description) until earned
  -- Note: the source asset folder had a "Perfect Streak (Secret)" PNG that
  -- duplicated "Perfect Streak" (practice-perfect-streak, 50-in-a-row) —
  -- removed as redundant, so this group is 5 badges, not 6 (56 total, not 57).
  ('secret-early-bird',      'Early Bird',    'Chim dậy sớm', 'Study before 8AM for 7 days',          'Học trước 8 giờ sáng, 7 ngày',   'secret', 800, TRUE),
  ('secret-night-owl',       'Night Owl',     'Cú đêm',       'Study after 10PM for 7 days',          'Học sau 10 giờ tối, 7 ngày',     'secret', 810, TRUE),
  ('secret-never-give-up',   'Never Give Up', 'Không bỏ cuộc','Keep learning after 20 wrong answers', 'Tiếp tục học sau 20 câu sai',    'secret', 820, TRUE),
  ('secret-speed-learner',   'Speed Learner', 'Học nhanh',    '20 correct answers within 10 minutes', '20 câu đúng trong 10 phút',      'secret', 830, TRUE),
  ('secret-marathon',        'Marathon',      'Chạy marathon','100 questions answered in one day',    '100 câu trả lời trong một ngày', 'secret', 840, TRUE)
ON CONFLICT (slug) DO NOTHING;
