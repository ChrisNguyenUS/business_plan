import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  getLegalName,
  getShortName,
  type ProfileNameFields,
} from './profile-utils';

const empty: ProfileNameFields = {
  first_name: null,
  middle_name: null,
  last_name: null,
  preferred_name: null,
  name_suffix: null,
  full_name: null,
};

const p = (overrides: Partial<ProfileNameFields>): ProfileNameFields => ({
  ...empty,
  ...overrides,
});

describe('getDisplayName', () => {
  it('rule 1: preferred_name + last_name', () => {
    expect(getDisplayName(p({ preferred_name: 'Chris', last_name: 'Nguyen' }))).toBe('Chris Nguyen');
  });

  it('rule 2: first_name + last_name', () => {
    expect(getDisplayName(p({ first_name: 'Christopher', last_name: 'Nguyen' }))).toBe('Christopher Nguyen');
  });

  it('rule 2: preferred_name wins over first_name', () => {
    expect(
      getDisplayName(p({ preferred_name: 'Chris', first_name: 'Christopher', last_name: 'Nguyen' })),
    ).toBe('Chris Nguyen');
  });

  it('rule 3: no last_name', () => {
    expect(getDisplayName(p({ preferred_name: 'Madonna' }))).toBe('Madonna');
  });

  it('rule 4: legacy full_name fallback', () => {
    expect(getDisplayName(p({ full_name: 'Old Name' }))).toBe('Old Name');
  });

  it('rule 5: nothing populated', () => {
    expect(getDisplayName(empty)).toBe('User');
  });
});

describe('getShortName', () => {
  it('prefers preferred_name', () => {
    expect(getShortName(p({ preferred_name: 'Chris', first_name: 'Christopher' }))).toBe('Chris');
  });

  it('falls back to first_name', () => {
    expect(getShortName(p({ first_name: 'Christopher' }))).toBe('Christopher');
  });

  it('falls back to first word of full_name', () => {
    expect(getShortName(p({ full_name: 'Christopher Nguyen' }))).toBe('Christopher');
  });

  it('falls back to User', () => {
    expect(getShortName(empty)).toBe('User');
  });
});

describe('getLegalName', () => {
  it('includes middle name', () => {
    expect(
      getLegalName(p({ first_name: 'Christopher', middle_name: 'Van', last_name: 'Nguyen' })),
    ).toBe('Christopher Van Nguyen');
  });

  it('includes suffix', () => {
    expect(
      getLegalName(
        p({ first_name: 'Christopher', middle_name: 'Van', last_name: 'Nguyen', name_suffix: 'Jr.' }),
      ),
    ).toBe('Christopher Van Nguyen Jr.');
  });

  it('falls back to full_name', () => {
    expect(getLegalName(p({ full_name: 'Christopher Nguyen' }))).toBe('Christopher Nguyen');
  });

  it('returns empty string when nothing populated', () => {
    expect(getLegalName(empty)).toBe('');
  });
});

describe('getInitials', () => {
  it('structured fields', () => {
    expect(getInitials(p({ preferred_name: 'Chris', last_name: 'Nguyen' }))).toBe('CN');
  });

  it('first_name only', () => {
    expect(getInitials(p({ first_name: 'Christopher' }))).toBe('C');
  });

  it('legacy full_name fallback', () => {
    expect(getInitials(p({ full_name: 'Christopher Nguyen' }))).toBe('CN');
  });

  it('legacy single-word full_name', () => {
    expect(getInitials(p({ full_name: 'Madonna' }))).toBe('M');
  });

  it('nothing populated', () => {
    expect(getInitials(empty)).toBe('?');
  });
});

describe('getAvatarUrl', () => {
  const SUPABASE_URL = 'https://example.supabase.co';
  let savedUrl: string | undefined;

  beforeEach(() => {
    savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });

  afterEach(() => {
    if (savedUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    }
  });

  it('builds public storage URL from relative path', () => {
    expect(getAvatarUrl('abc-123/avatar.webp')).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/avatars/abc-123/avatar.webp`,
    );
  });

  it('appends cache-busting version param', () => {
    expect(getAvatarUrl('abc-123/avatar.webp', '2026-07-03T00:00:00Z')).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/avatars/abc-123/avatar.webp?v=2026-07-03T00%3A00%3A00Z`,
    );
  });

  it('returns null for null path', () => {
    expect(getAvatarUrl(null)).toBeNull();
  });

  it('returns null when supabase url is not configured', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(getAvatarUrl('abc-123/avatar.webp')).toBeNull();
  });
});
