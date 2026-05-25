-- N400 Civics Test App — Table Definitions
-- Applied via Supabase MCP apply_migration

-- ── Content tables (public read, admin write) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.n400_questions (
  id              INT PRIMARY KEY CHECK (id BETWEEN 1 AND 128),
  category        TEXT NOT NULL,
  question_en     TEXT NOT NULL,
  question_vi     TEXT NOT NULL,
  question_audio_url TEXT,
  is_location_based BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     INT NOT NULL REFERENCES public.n400_questions(id) ON DELETE CASCADE,
  answer_en       TEXT NOT NULL,
  answer_vi       TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  answer_audio_url TEXT,
  display_order   INT NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_location_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     INT NOT NULL REFERENCES public.n400_questions(id) ON DELETE CASCADE,
  state_code      CHAR(2) NOT NULL,
  answer_en       TEXT NOT NULL,
  answer_vi       TEXT NOT NULL,
  answer_audio_url TEXT,
  UNIQUE (question_id, state_code, answer_en)
);

CREATE TABLE IF NOT EXISTS public.n400_state_data (
  state_code      CHAR(2) PRIMARY KEY,
  state_name_en   TEXT NOT NULL,
  state_name_vi   TEXT NOT NULL,
  governor_name   TEXT NOT NULL,
  capital_city    TEXT,
  senator_1       TEXT,
  senator_2       TEXT
);

CREATE TABLE IF NOT EXISTS public.n400_representatives (
  state_code      CHAR(2) NOT NULL,
  district_number INT NOT NULL,
  rep_name        TEXT NOT NULL,
  rep_audio_url   TEXT,
  PRIMARY KEY (state_code, district_number)
);

-- ── User tables (user-scoped RLS) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.n400_user_profile (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city            TEXT,
  state_code      CHAR(2),
  zipcode         CHAR(5),
  district_number INT,
  district_resolved_at TIMESTAMPTZ,
  current_streak  INT NOT NULL DEFAULT 0,
  longest_streak  INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n400_quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL CHECK (mode IN ('practice', 'mock_test', 'flashcard')),
  score           INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  passed          BOOLEAN,
  slide_manifest  JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.n400_question_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES public.n400_quiz_attempts(id) ON DELETE CASCADE,
  question_id     INT NOT NULL REFERENCES public.n400_questions(id),
  was_correct     BOOLEAN NOT NULL,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_n400_answers_question_id ON public.n400_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_n400_location_answers_question_state ON public.n400_location_answers(question_id, state_code);
CREATE INDEX IF NOT EXISTS idx_n400_quiz_attempts_user_id ON public.n400_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_n400_question_attempts_attempt_id ON public.n400_question_attempts(attempt_id);
CREATE INDEX IF NOT EXISTS idx_n400_question_attempts_question_id ON public.n400_question_attempts(question_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.n400_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_location_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_state_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n400_question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n400 questions public read" ON public.n400_questions FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "n400 answers public read" ON public.n400_answers FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "n400 location answers public read" ON public.n400_location_answers FOR SELECT USING (true);
CREATE POLICY "n400 state data public read" ON public.n400_state_data FOR SELECT USING (true);
CREATE POLICY "n400 reps public read" ON public.n400_representatives FOR SELECT USING (true);

CREATE POLICY "n400 questions admin write" ON public.n400_questions FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 answers admin write" ON public.n400_answers FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 location answers admin write" ON public.n400_location_answers FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 state data admin write" ON public.n400_state_data FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "n400 reps admin write" ON public.n400_representatives FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "n400 user profile own read" ON public.n400_user_profile FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "n400 user profile own write" ON public.n400_user_profile FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n400 user profile admin read" ON public.n400_user_profile FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "n400 attempts own insert" ON public.n400_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "n400 attempts own select" ON public.n400_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "n400 attempts admin read" ON public.n400_quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "n400 question attempts own" ON public.n400_question_attempts FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.n400_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.n400_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "n400 question attempts admin read" ON public.n400_question_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
