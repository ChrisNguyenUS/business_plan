// The longest answer text stored for a mock question (Civics oral spec §6). Kept
// import-free on purpose: attempt-row.ts loads on every N400Ready page (through
// user-state), so it must not pull the oral grader in with this limit.
export const MAX_TRANSCRIPT = 500;
