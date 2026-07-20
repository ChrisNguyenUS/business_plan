-- Growth Engine G3a: CTA impression / dismiss / click RPCs (spec §4).
--
-- Like the G2 prompt funnel, every CTA write goes through a SECURITY DEFINER
-- function so the event log that feeds both scoring and the G4 funnel view
-- cannot be forged. This migration also finishes what n400_23 started: the
-- cta_* types come OFF the client INSERT whitelist. That matters more here
-- than it did for prompts, because cta_dismissed actually feeds a scoring
-- rule (dismissed_consultation_cta_3).
--
-- No new state table on purpose: dismiss counts, group mutes and per-CTA
-- cooldowns are all derivable from the cta_* events themselves, and the
-- 7-day global cap reads n400_lead_profiles.last_growth_prompt_at, which has
-- existed since n400_15.

-- ── evaluation: log every run, shown or not (spec §1.5b) ───────────────────
-- Deliberately SEPARATE from the impression RPC below. The whole point of
-- this table is answering "why did this user see nothing?", so it must be
-- written when the answer is "nothing" — which is precisely when no
-- impression happens. Coupling the two would make the log record only the
-- cases that need no explaining.
CREATE OR REPLACE FUNCTION public.n400_log_cta_decision(
  p_eligible_ctas text[] DEFAULT '{}',
  p_selected_cta  text   DEFAULT NULL,
  p_reason        text   DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO n400_cta_decision_log (user_id, eligible_ctas, selected_cta, reason)
  VALUES (v_user, p_eligible_ctas, p_selected_cta, p_reason);
END; $$;

-- ── impression: stamps the 7-day cap and emits the event ───────────────────
CREATE OR REPLACE FUNCTION public.n400_mark_cta_shown(
  p_cta_id        text,
  p_variant       text DEFAULT 'a',
  p_surface       text DEFAULT NULL    -- 'results' | 'dashboard'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;

  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  -- The 7-day cap (spec §4.1 rule 1) is stamped ONLY here, on a real
  -- impression. The evaluator selecting a CTA is not enough: a decision the
  -- user never actually saw — tab closed mid-load, card unmounted before
  -- paint, flag flipped between decision and render — must not consume the
  -- week. Callers must invoke this from the rendered card, never from the
  -- evaluation path.
  INSERT INTO n400_lead_profiles (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE n400_lead_profiles
  SET last_growth_prompt_at = now(), updated_at = now()
  WHERE user_id = v_user;

  -- group_key rides in the payload because the scoring rule
  -- dismissed_consultation_cta_3 already reads payload->>'group', and the G4
  -- funnel groups by cta_id × variant × surface.
  PERFORM n400_emit_growth_event(v_user, 'cta_shown',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── dismiss ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_dismiss_cta(
  p_cta_id  text,
  p_variant text DEFAULT 'a',
  p_surface text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  PERFORM n400_emit_growth_event(v_user, 'cta_dismissed',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── click ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.n400_click_cta(
  p_cta_id  text,
  p_variant text DEFAULT 'a',
  p_surface text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_group text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_surface IS NOT NULL AND p_surface NOT IN ('results','dashboard') THEN
    RAISE EXCEPTION 'invalid surface %', p_surface;
  END IF;
  SELECT group_key INTO v_group FROM n400_cta_definitions
  WHERE cta_id = p_cta_id AND variant = p_variant AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown cta %/%', p_cta_id, p_variant;
  END IF;

  -- G3b reads the newest cta_clicked to fill source_cta on the consultation
  -- request (spec §7: conversion attribution = last CTA click before submit).
  PERFORM n400_emit_growth_event(v_user, 'cta_clicked',
    jsonb_build_object('cta_id', p_cta_id, 'variant', p_variant,
                       'surface', p_surface, 'group', v_group));
END; $$;

-- ── decision-log retention (spec §1.5b: 30 days, no cron) ───────────────────
-- Probabilistic cleanup: ~1 in 50 writes trims the table. Cheap, self-healing,
-- and keeps this debug table from growing without bound at one row per
-- dashboard load.
CREATE OR REPLACE FUNCTION public.n400_trg_cta_decision_log_gc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF random() < 0.02 THEN
    DELETE FROM n400_cta_decision_log WHERE evaluated_at < now() - interval '30 days';
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_n400_cta_decision_log_gc ON public.n400_cta_decision_log;
CREATE TRIGGER trg_n400_cta_decision_log_gc
AFTER INSERT ON public.n400_cta_decision_log
FOR EACH ROW EXECUTE FUNCTION public.n400_trg_cta_decision_log_gc();

-- ── close the last client-writable growth events (finishes n400_23) ─────────
-- cta_shown/dismissed/clicked are now RPC-only. cta_dismissed feeds the
-- dismissed_consultation_cta_3 penalty, and G4's funnel view is built on all
-- three, so none of them may be client-forgeable. That leaves only
-- checklist_viewed / consultation_form_opened on the whitelist — pure UI
-- telemetry that touches neither score nor funnel.
DROP POLICY IF EXISTS "n400 growth events own insert client types" ON public.n400_growth_events;

CREATE POLICY "n400 growth events own insert client types" ON public.n400_growth_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND event_type IN ('checklist_viewed','consultation_form_opened')
  );

REVOKE EXECUTE ON FUNCTION public.n400_log_cta_decision(text[], text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_mark_cta_shown(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_dismiss_cta(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.n400_click_cta(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.n400_log_cta_decision(text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_mark_cta_shown(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_dismiss_cta(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.n400_click_cta(text, text, text) TO authenticated;
