-- N400 app UI language. NULL = user has never chosen -> first-login popup.
-- Intentionally NOT on shared `profiles` (its preferred_language is
-- DEFAULT 'en' NOT NULL and belongs to internal_app/portal semantics).
ALTER TABLE n400_user_profile
  ADD COLUMN IF NOT EXISTS ui_language text
  CONSTRAINT n400_user_profile_ui_language_check
  CHECK (ui_language IN ('vi', 'en'));
