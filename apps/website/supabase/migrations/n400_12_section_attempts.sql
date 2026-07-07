-- n400_12: per-section attempts for the Speaking/Writing study sections.
-- Civics attempts stay in n400_question_attempts (INT FK to n400_questions);
-- new sections use string item ids (wm-1, yn-3, wr-7) so they get a flat
-- table of their own. "Known" state is derived client-side from the last
-- flashcard-mode attempt per item (same derivation as civics flashcardKnown).

CREATE TABLE IF NOT EXISTS public.n400_section_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section      TEXT NOT NULL CHECK (section IN ('whatmean', 'yesno', 'writing')),
  item_id      TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('practice', 'flashcard', 'mock_test')),
  was_correct  BOOLEAN NOT NULL,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_n400_section_attempts_user ON public.n400_section_attempts(user_id, answered_at);

ALTER TABLE public.n400_section_attempts ENABLE ROW LEVEL SECURITY;

-- Users own their attempt rows; both read and write gated on auth.uid().
CREATE POLICY "n400 section attempts own" ON public.n400_section_attempts FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "n400 section attempts admin read" ON public.n400_section_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
