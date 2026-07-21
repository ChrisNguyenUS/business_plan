-- Growth Engine G3b: server-side rollups for the growth read path.
--
-- loadGrowthContext / loadLearningSignals previously hauled raw rows
-- (1 growth event per graded answer, 1 quiz envelope per practice answer).
-- PostgREST silently caps a response at 1000 rows with no defined order, so
-- the most active users would get truncated, arbitrary subsets — S2
-- (min_practice_days) breaks for exactly the users it targets. These rollups
-- do the counting in SQL; result size is bounded by distinct study days.

-- One row per UTC day with graded activity.
-- last_at deliberately included: profiling's "active days since skip" needs
-- "was there an event this day AFTER timestamp T" ⇔ max(created_at) > T.
CREATE OR REPLACE FUNCTION public.n400_graded_day_rollup()
RETURNS TABLE (day date, practice_count int, mock_count int, last_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*) FILTER (WHERE event_type = 'practice_completed')::int AS practice_count,
    COUNT(*) FILTER (WHERE event_type = 'mock_completed')::int    AS mock_count,
    MAX(created_at)                                               AS last_at
  FROM n400_growth_events
  WHERE user_id = auth.uid()
    AND event_type IN ('practice_completed', 'mock_completed')
  GROUP BY 1
  ORDER BY 1;
$$;

-- Mastery / coverage / per-section tallies, mirroring the client's pure
-- derivations (quiz-engine.ts masteredQuestionIds, section-progress.ts
-- deriveSectionMastered / deriveSectionGradedTally):
--   graded   = mode <> 'flashcard'
--   mastered = LATEST graded attempt per question/item was correct
--   seen     = any attempt, any mode
-- If these TS functions ever change, this SQL must change with them — the
-- Step 4 comparison query is the drift check, rerun it.
CREATE OR REPLACE FUNCTION public.n400_learning_rollup()
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  WITH civics AS (
    SELECT qa.question_id, qa.was_correct, qa.answered_at, q.mode
    FROM n400_question_attempts qa
    JOIN n400_quiz_attempts q ON q.id = qa.attempt_id
    WHERE q.user_id = auth.uid()
  ),
  civics_latest AS (
    SELECT DISTINCT ON (question_id) question_id, was_correct
    FROM civics WHERE mode <> 'flashcard'
    ORDER BY question_id, answered_at DESC
  ),
  section_graded AS (
    SELECT section, item_id, was_correct, answered_at
    FROM n400_section_attempts
    WHERE user_id = auth.uid() AND mode <> 'flashcard'
  ),
  section_latest AS (
    SELECT DISTINCT ON (section, item_id) section, was_correct
    FROM section_graded
    ORDER BY section, item_id, answered_at DESC
  ),
  section_stats AS (
    SELECT
      g.section,
      (SELECT COUNT(*) FROM section_latest l
        WHERE l.section = g.section AND l.was_correct)::int AS mastered,
      COUNT(*) FILTER (WHERE g.was_correct)::int            AS graded_correct,
      COUNT(*)::int                                         AS graded_total
    FROM section_graded g
    GROUP BY g.section
  )
  SELECT jsonb_build_object(
    'civics_seen',     (SELECT COUNT(DISTINCT question_id) FROM civics),
    'civics_mastered', (SELECT COUNT(*) FROM civics_latest WHERE was_correct),
    'sections', COALESCE(
      (SELECT jsonb_object_agg(section, jsonb_build_object(
                'mastered', mastered,
                'graded_correct', graded_correct,
                'graded_total', graded_total))
         FROM section_stats),
      '{}'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.n400_graded_day_rollup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.n400_learning_rollup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.n400_graded_day_rollup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_learning_rollup() TO authenticated;
