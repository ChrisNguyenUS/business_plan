import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { N400_LANG_COOKIE } from '@/lib/n400/i18n/config';
import { config, proxy } from './proxy';

// A stand-in Supabase: getUser() returns db.user, and each table read records
// that it started. A test can hold the profiles read open (db.profilesGate)
// to see which other reads begin before it finishes.
const db = vi.hoisted(() => ({
  user: null as { id: string } | null,
  role: null as string | null,
  n400Profile: null as Record<string, unknown> | null,
  started: [] as string[],
  profilesGate: null as Promise<void> | null,
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: (table: string) => {
      const read = async () => {
        db.started.push(table);
        if (table === 'profiles') {
          if (db.profilesGate) await db.profilesGate;
          return { data: db.role ? { role: db.role } : null };
        }
        if (table === 'n400_user_profile') return { data: db.n400Profile };
        return { data: null };
      };
      const builder = { select: () => builder, eq: () => builder, single: read, maybeSingle: read };
      return builder;
    },
  }),
}));

const request = (path: string) => new NextRequest(new URL(path, 'https://www.mannaos.com'));
const redirectPath = (res: Response) => {
  const location = res.headers.get('location');
  return location ? new URL(location).pathname : null;
};

beforeEach(() => {
  db.user = null;
  db.role = null;
  db.n400Profile = null;
  db.started = [];
  db.profilesGate = null;
});

describe('proxy and the N400 service worker', () => {
  // navigator.serviceWorker.register() rejects a script that sits behind a
  // redirect, so /sw-n400.js must be served as-is, never sent to /en/sw-n400.js.
  it('the matcher skips /sw-n400.js', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/sw-n400.js' })).toBe(false);
  });

  it('does not redirect /sw-n400.js even when it runs', async () => {
    const res = await proxy(request('/sw-n400.js'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('still sends a page without a locale to one', async () => {
    const res = await proxy(request('/about'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toMatch(/^\/(en|vi)\/about$/);
  });
});

describe('proxy auth gates', () => {
  it('sends an anonymous visitor on an app page to the N400 login', async () => {
    const res = await proxy(request('/n400ready/study'));
    expect(redirectPath(res)).toBe('/n400ready/login');
  });

  it('sends a signed-in learner without an N400 profile to onboarding', async () => {
    db.user = { id: 'u1' };
    db.role = 'client';
    const res = await proxy(request('/n400ready/study'));
    expect(redirectPath(res)).toBe('/n400ready/onboarding');
  });

  it('lets a learner with a profile through and heals the language cookie', async () => {
    db.user = { id: 'u1' };
    db.role = 'client';
    db.n400Profile = { user_id: 'u1', ui_language: 'vi' };
    const res = await proxy(request('/n400ready/study'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get(N400_LANG_COOKIE)?.value).toBe('vi');
  });

  it('sends a non-admin on an admin page to the login page', async () => {
    db.user = { id: 'u1' };
    db.role = 'client';
    const res = await proxy(request('/en/admin'));
    expect(redirectPath(res)).toBe('/en/login');
    expect(db.started).not.toContain('n400_user_profile');
  });

  it('reads the role and the N400 profile at the same time', async () => {
    db.user = { id: 'u1' };
    db.role = 'client';
    db.n400Profile = { user_id: 'u1', ui_language: 'en' };
    let release!: () => void;
    db.profilesGate = new Promise<void>((resolve) => (release = resolve));

    const pending = proxy(request('/n400ready/study'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(db.started).toEqual(['profiles', 'n400_user_profile']);

    release();
    const res = await pending;
    expect(res.headers.get('location')).toBeNull();
  });
});
