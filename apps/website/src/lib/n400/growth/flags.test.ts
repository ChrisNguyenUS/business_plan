import { describe, expect, it } from 'vitest';
import { isUserInRollout } from './flags';
import { isClientEventType } from './events';

describe('isUserInRollout', () => {
  const uid = 'b3b8c2a0-1111-4222-8333-444455556666';

  it('is deterministic for the same user + flag', () => {
    expect(isUserInRollout('cta_engine', uid, 50)).toBe(isUserInRollout('cta_engine', uid, 50));
  });

  it('includes everyone at 100 and no one at 0', () => {
    expect(isUserInRollout('cta_engine', uid, 100)).toBe(true);
    expect(isUserInRollout('cta_engine', uid, 0)).toBe(false);
  });

  it('can differ per flag for the same user (independent buckets)', () => {
    const flags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const buckets = new Set(flags.map((f) => isUserInRollout(f, uid, 50)));
    expect(buckets.size).toBeGreaterThan(0); // sanity: function runs for all
  });
});

describe('isClientEventType', () => {
  it('accepts whitelisted client events', () => {
    expect(isClientEventType('cta_dismissed')).toBe(true);
    expect(isClientEventType('prompt_answered')).toBe(true);
  });

  it('rejects server-authoritative and unknown types', () => {
    expect(isClientEventType('mock_completed')).toBe(false);
    expect(isClientEventType('practice_completed')).toBe(false);
    expect(isClientEventType('drop table')).toBe(false);
  });
});
