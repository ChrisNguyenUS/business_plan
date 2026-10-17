import { describe, expect, it } from 'vitest';
import { anonN400Destination, loginLangSwitch } from './anon-redirect';

describe('anonN400Destination', () => {
  it('sends the exact app root to the landing page in the cookie language', () => {
    expect(anonN400Destination('/n400ready', 'en', 'vi-VN,vi;q=0.9')).toBe('/en/n400ready');
    expect(anonN400Destination('/n400ready/', 'vi', 'en-US')).toBe('/vi/n400ready');
  });

  it('falls back to Accept-Language when there is no valid cookie', () => {
    expect(anonN400Destination('/n400ready', undefined, 'vi-VN,vi;q=0.9,en;q=0.8')).toBe('/vi/n400ready');
    expect(anonN400Destination('/n400ready', 'fr', 'en-US,en;q=0.9')).toBe('/en/n400ready');
    expect(anonN400Destination('/n400ready', undefined, '')).toBe('/en/n400ready');
  });

  it('keeps sending deep app paths to the login page', () => {
    expect(anonN400Destination('/n400ready/practice', 'vi', 'vi')).toBe('/n400ready/login');
    expect(anonN400Destination('/n400ready/mock-test/civics', undefined, '')).toBe('/n400ready/login');
    expect(anonN400Destination('/n400readyx', undefined, '')).toBe('/n400ready/login');
  });
});

describe('loginLangSwitch', () => {
  it('turns ?lang= on the login page into a cookie + clean URL', () => {
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams('lang=en'))).toEqual({ lang: 'en', search: '' });
    expect(loginLangSwitch('/n400ready/login/', new URLSearchParams('lang=vi&reset=success'))).toEqual({
      lang: 'vi',
      search: '?reset=success',
    });
  });

  it('ignores other pages and unknown languages', () => {
    expect(loginLangSwitch('/n400ready', new URLSearchParams('lang=en'))).toBeNull();
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams('lang=fr'))).toBeNull();
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams(''))).toBeNull();
  });
});
