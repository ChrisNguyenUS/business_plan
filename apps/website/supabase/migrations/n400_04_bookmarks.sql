-- N400 bookmarks: per-user saved questions for review.
-- Schema spec didn't include this in v1; v1 UI surfaces /bookmark which expects a list of saved question IDs per user.

CREATE TABLE IF NOT EXISTS public.n400_bookmarks (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id INT  NOT NULL REFERENCES public.n400_questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_n400_bookmarks_user_id ON public.n400_bookmarks(user_id);

ALTER TABLE public.n400_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users own their bookmark rows; both read and write gated on auth.uid().
CREATE POLICY "n400 bookmarks own" ON public.n400_bookmarks FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "n400 bookmarks admin read" ON public.n400_bookmarks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
