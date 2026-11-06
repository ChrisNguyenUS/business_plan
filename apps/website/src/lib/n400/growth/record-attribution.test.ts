import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCookie, recordAttribution } from './record-attribution';

const touch = {
  landing_page: '/vi/n400ready',
  ts: '2026-11-05T00:00:00.000Z',
  utm_source: 'facebook',
};
const raw = JSON.stringify({ first: touch, last: touch });
// Next encodes cookie values with encodeURIComponent when it sets them.
const cookieString = `a=1; n400_attrib=${encodeURIComponent(raw)}; b=2`;

afterEach(() => {
  vi.useRealTimers();
});

describe('readCookie', () => {
  it('finds one cookie among others and decodes it', () => {
    expect(readCookie(cookieString, 'n400_attrib')).toBe(raw);
  });

  it('returns undefined when the cookie is missing', () => {
    expect(readCookie('a=1; b=2', 'n400_attrib')).toBeUndefined();
    expect(readCookie('', 'n400_attrib')).toBeUndefined();
  });

  it('does not match another cookie whose name ends the same way', () => {
    expect(readCookie('xn400_attrib=1', 'n400_attrib')).toBeUndefined();
  });

  it('returns undefined for a value that is not valid URI encoding', () => {
    expect(readCookie('n400_attrib=%E0%A4%A', 'n400_attrib')).toBeUndefined();
  });
});

describe('recordAttribution', () => {
  it('copies first and last touch into the lead profile', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await recordAttribution({ rpc }, cookieString);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('n400_set_attribution', { p_first: touch, p_last: touch });
  });

  it('does nothing when there is no touch cookie', async () => {
    const rpc = vi.fn();
    await recordAttribution({ rpc }, 'a=1');
    await recordAttribution({ rpc }, 'n400_attrib=not-json');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('never throws when the RPC fails', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(recordAttribution({ rpc }, cookieString)).resolves.toBeUndefined();
  });

  it('stops waiting after the timeout, so a slow RPC cannot hold up sign-in', async () => {
    vi.useFakeTimers();
    const rpc = vi.fn(() => new Promise(() => {}));
    let settled = false;
    const done = recordAttribution({ rpc }, cookieString, 1500).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(1499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(settled).toBe(true);
  });
});
