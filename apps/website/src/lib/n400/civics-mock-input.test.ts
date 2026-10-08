import { describe, expect, it } from 'vitest';
import { parseMockKind, parseStartMockInput } from './civics-mock-input';

describe('parseMockKind', () => {
  it('accepts the two mock kinds', () => {
    expect(parseMockKind('civics')).toBe('civics');
    expect(parseMockKind('full')).toBe('full');
  });

  it.each([undefined, null, '', 'Civics', 'speaking', 1])('rejects %s', (kind) => {
    expect(() => parseMockKind(kind)).toThrow('invalid kind');
  });
});

describe('parseStartMockInput (RLS hardening spec §2.2)', () => {
  const ok = { kind: 'full', seed: 'full-123', stateCode: 'TX', districtNumber: null };

  it('passes valid input through unchanged', () => {
    expect(parseStartMockInput(ok)).toEqual(ok);
    expect(parseStartMockInput({ ...ok, kind: 'civics', districtNumber: 7 })).toEqual({ ...ok, kind: 'civics', districtNumber: 7 });
  });

  it('keeps a state code outside the list: the client built its slides with it', () => {
    expect(parseStartMockInput({ ...ok, stateCode: 'ZZ' }).stateCode).toBe('ZZ');
  });

  it.each([
    [{ ...ok, seed: '' }, 'invalid seed'],
    [{ ...ok, seed: 'x'.repeat(65) }, 'invalid seed'],
    [{ ...ok, seed: 42 }, 'invalid seed'],
    [{ ...ok, stateCode: '' }, 'invalid state'],
    [{ ...ok, stateCode: 'TOO-LONG-1' }, 'invalid state'],
    [{ ...ok, districtNumber: 1.5 }, 'invalid district'],
    [{ ...ok, districtNumber: undefined }, 'invalid district'],
    [{ ...ok, kind: 'speaking' }, 'invalid kind'],
    [null, 'invalid input'],
  ])('rejects %j', (input, message) => {
    expect(() => parseStartMockInput(input)).toThrow(message);
  });
});
