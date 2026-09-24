/* Password policy shared by every "set a password" form (sign-up and both
   reset-password pages). Labels live with each UI so they can be translated. */

export type PasswordRuleId = "length" | "case" | "number" | "symbol";

export const PASSWORD_RULES: { id: PasswordRuleId; test: (v: string) => boolean }[] = [
  { id: "length", test: (v) => v.length >= 8 },
  { id: "case", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", test: (v) => /\d/.test(v) },
  { id: "symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const STRENGTH_SEGMENTS = 5;

export function passwordRuleState(password: string) {
  return PASSWORD_RULES.map((r) => ({ id: r.id, met: r.test(password) }));
}

export function meetsPasswordPolicy(password: string) {
  return PASSWORD_RULES.every((r) => r.test(password));
}

/** 0–5: one point per satisfied rule, plus one for a comfortably long password. */
export function passwordStrengthScore(password: string) {
  if (!password) return 0;
  const met = PASSWORD_RULES.filter((r) => r.test(password)).length;
  return Math.min(STRENGTH_SEGMENTS, met + (password.length >= 12 ? 1 : 0));
}
