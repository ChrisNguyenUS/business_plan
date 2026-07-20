-- Growth Engine G1: one-time backfill so existing users start with correct scores.
-- The per-row recompute trigger is disabled during bulk insert, then every
-- affected user is recomputed once.

ALTER TABLE public.n400_growth_events DISABLE TRIGGER trg_n400_growth_recompute;

-- account_created for every existing identity (event timestamped at signup)
INSERT INTO public.n400_growth_events (user_id, event_type, created_at)
SELECT p.id, 'account_created', p.created_at
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = p.id AND e.event_type = 'account_created')
ON CONFLICT DO NOTHING;

-- onboarding_completed + address_entered from n400_user_profile
INSERT INTO public.n400_growth_events (user_id, event_type, created_at)
SELECT up.user_id, 'onboarding_completed', up.created_at
FROM public.n400_user_profile up
WHERE NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = up.user_id AND e.event_type = 'onboarding_completed')
ON CONFLICT DO NOTHING;

INSERT INTO public.n400_growth_events (user_id, event_type, payload, created_at)
SELECT up.user_id, 'address_entered',
       jsonb_build_object('state', up.state_code, 'city', up.city), up.created_at
FROM public.n400_user_profile up
WHERE up.state_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.n400_growth_events e
                  WHERE e.user_id = up.user_id AND e.event_type = 'address_entered')
ON CONFLICT DO NOTHING;

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
