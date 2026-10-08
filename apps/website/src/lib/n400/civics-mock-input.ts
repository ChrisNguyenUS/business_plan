// Server-side checks on what the browser sends to the Civics mock actions (RLS
// hardening spec §2.2–2.3). Untrusted input: never assume its shape.

import type { CivicsMockKind } from './civics-mock-slides';
import type { StateCode } from './state-data';

export interface StartMockInput {
  kind: CivicsMockKind;
  seed: string;
  stateCode: StateCode;
  districtNumber: number | null;
}

export function parseMockKind(kind: unknown): CivicsMockKind {
  if (kind === 'civics' || kind === 'full') return kind;
  throw new Error('invalid kind');
}

/** stateCode is NOT checked against STATES_BY_CODE: profiles.state_code comes
 *  straight from Geoapify, and the client built its options with whatever it
 *  holds, so the key must be built from the same value (spec §2.2). */
export function parseStartMockInput(input: unknown): StartMockInput {
  if (typeof input !== 'object' || input === null) throw new Error('invalid input');
  const { kind, seed, stateCode, districtNumber } = input as Record<string, unknown>;
  if (typeof seed !== 'string' || seed.length === 0 || seed.length > 64) throw new Error('invalid seed');
  if (typeof stateCode !== 'string' || stateCode.length === 0 || stateCode.length > 8) {
    throw new Error('invalid state');
  }
  if (districtNumber !== null && !Number.isInteger(districtNumber)) throw new Error('invalid district');
  return {
    kind: parseMockKind(kind),
    seed,
    stateCode: stateCode as StateCode,
    districtNumber: districtNumber as number | null,
  };
}
