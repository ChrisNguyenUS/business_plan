import { describe, expect, it } from 'vitest';
import { STATES } from '../state-data';
import { ALL_STATE_SLUGS, stateFromSlug, stateSlug } from './state-slugs';

describe('state slugs', () => {
  it('has one unique, URL-safe slug per state and territory', () => {
    expect(ALL_STATE_SLUGS).toHaveLength(56);
    expect(new Set(ALL_STATE_SLUGS).size).toBe(56);
    for (const s of ALL_STATE_SLUGS) expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('builds slugs from the English name', () => {
    expect(stateSlug('TX')).toBe('texas');
    expect(stateSlug('NY')).toBe('new-york');
    expect(stateSlug('DC')).toBe('district-of-columbia');
    expect(stateSlug('MP')).toBe('northern-mariana-islands');
  });

  it('round-trips every code', () => {
    for (const s of STATES) expect(stateFromSlug(stateSlug(s.code))).toBe(s.code);
  });

  it('returns null for unknown or differently-cased slugs', () => {
    expect(stateFromSlug('atlantis')).toBeNull();
    expect(stateFromSlug('Texas')).toBeNull();
    expect(stateFromSlug('')).toBeNull();
  });
});
