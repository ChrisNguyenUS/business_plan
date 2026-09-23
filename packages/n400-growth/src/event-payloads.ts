// Payload shapes for n400_growth_events.payload, read from the emitters that
// write them. payload is jsonb, so nothing guarantees these at runtime — they
// describe what the database writes today. A consumer that reads a field not
// listed here is reading something that is never written.

/** n400_18_growth_emitters.sql — address_entered */
export interface AddressEnteredPayload {
  state: string | null;
  city: string | null;
}

/** n400_18_growth_emitters.sql — practice_completed / mock_completed.
 *  One practice event = one graded question (the envelope row), not one
 *  session. Mock events are one per finished mock test. */
export interface AttemptCompletedPayload {
  attempt_id: string;
  score: number;
  total: number;
  passed: boolean;
}

/** n400_21_growth_profiling_rpcs.sql — prompt_shown / prompt_skipped */
export interface PromptPayload {
  question_key: string;
  variant: string | null;
  surface: string | null;
}

/** n400_21_growth_profiling_rpcs.sql — prompt_answered */
export interface PromptAnsweredPayload extends PromptPayload {
  answer: string;
}

/** n400_24_growth_cta_rpcs.sql — cta_shown / cta_dismissed / cta_clicked */
export interface CtaPayload {
  cta_id: string;
  variant: string | null;
  surface: string | null;
  group: string | null;
}

/** account_created, onboarding_completed and every reserved type write `{}`. */
export type EmptyPayload = Record<string, never>;
