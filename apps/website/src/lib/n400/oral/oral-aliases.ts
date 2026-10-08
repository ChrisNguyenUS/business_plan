// Hand-written equivalent phrasings, graded as exact accepted answers (spec §3.1).
// Every entry needs a one-line reason and is covered by get-oral-config.test.ts.
// Keep aliases narrow: the taught answer's wording, never free paraphrase, and
// never added just to turn a `near` into `correct`. Changes are spec changes (D10).

export const ORAL_ALIASES: Readonly<Record<number, string[][]>> = {
  // Q4 — "self-government" is commonly explained as "people govern themselves"; `people` dropped by question-echo.
  4: [['govern themselves']],
  // Q37 — "prevent … from becoming too powerful" is the everyday wording of the taught "keep … from"; owner-approved 2026-10-08 (D10).
  37: [['prevent powerful']],
};
