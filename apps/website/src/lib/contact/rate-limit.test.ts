import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContactLimiter, memoryLimiter } from './rate-limit';

// A stand-in for @upstash/ratelimit: records how it was built and answers
// limit() with whatever upstash.limit returns (or throws).
const upstash = vi.hoisted(() => ({
  options: null as Record<string, unknown> | null,
  limit: (key: string): Promise<{ success: boolean }> => {
    void key;
    return Promise.resolve({ success: true });
  },
}));

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = (tokens: number, window: string) => ({ tokens, window });
    constructor(options: Record<string, unknown>) {
      upstash.options = options;
    }
    limit(key: string) {
      return upstash.limit(key);
    }
  }
  return { Ratelimit };
});
vi.mock('@upstash/redis', () => ({ Redis: class {} }));

const withUpstash = { UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'token' };

beforeEach(() => {
  upstash.options = null;
  upstash.limit = () => Promise.resolve({ success: true });
});

describe('memoryLimiter', () => {
  it('allows 5 submissions a minute per IP, then refuses until the window resets', async () => {
    let now = 0;
    const limiter = memoryLimiter(5, 60_000, () => now);
    for (let i = 0; i < 5; i++) expect(await limiter.allow('1.1.1.1')).toBe(true);
    expect(await limiter.allow('1.1.1.1')).toBe(false);
    expect(await limiter.allow('2.2.2.2')).toBe(true);
    now = 60_001;
    expect(await limiter.allow('1.1.1.1')).toBe(true);
  });
});

describe('createContactLimiter', () => {
  it('uses the in-memory limiter when Upstash is not configured', async () => {
    const limiter = createContactLimiter({});
    for (let i = 0; i < 5; i++) expect(await limiter.allow('1.1.1.1')).toBe(true);
    expect(await limiter.allow('1.1.1.1')).toBe(false);
    expect(upstash.options).toBeNull();
  });

  it('asks Upstash (shared by every server instance) when it is configured', async () => {
    const keys: string[] = [];
    upstash.limit = (key) => {
      keys.push(key);
      return Promise.resolve({ success: false });
    };
    const limiter = createContactLimiter(withUpstash);
    expect(await limiter.allow('1.1.1.1')).toBe(false);
    expect(keys).toEqual(['1.1.1.1']);
    expect(upstash.options).toMatchObject({ prefix: 'contact:ip', limiter: { tokens: 5, window: '1 m' } });
  });

  it('falls back to memory when Upstash errors, so a lead is never refused for that', async () => {
    upstash.limit = () => Promise.reject(new Error('redis down'));
    const limiter = createContactLimiter(withUpstash);
    expect(await limiter.allow('1.1.1.1')).toBe(true);
  });
});
