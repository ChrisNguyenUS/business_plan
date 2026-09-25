import { describe, expect, it } from 'vitest';
import { answerSurface, effectiveAnswerMode, isInAppBrowser, isIOSDevice, voiceInputFor } from './voice-support';

// Real user agents from the Gate 0 spike, plus common in-app browsers.
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  fbIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A437 [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone18,2;FBMD/iPhone;FBSN/iOS;FBSV/27.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]',
  fbAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918U Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  zalo:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/1.0',
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
};

const on = { apiPresent: true, enabled: true, androidOn: false };

describe('isInAppBrowser', () => {
  it.each([UA.fbIos, UA.fbAndroid, UA.zalo, UA.instagram])('in-app: %s', (ua) => {
    expect(isInAppBrowser(ua)).toBe(true);
  });

  it.each([UA.iphoneSafari, UA.macChrome, UA.androidChrome])('browser: %s', (ua) => {
    expect(isInAppBrowser(ua)).toBe(false);
  });
});

describe('voiceInputFor', () => {
  it('mic on iPhone Safari and desktop Chrome', () => {
    expect(voiceInputFor({ ua: UA.iphoneSafari, ...on })).toBe('mic');
    expect(voiceInputFor({ ua: UA.macChrome, ...on })).toBe('mic');
  });

  it('in-app browsers get the typed fallback, even without the API (D12)', () => {
    expect(voiceInputFor({ ua: UA.fbIos, ...on })).toBe('typed');
    expect(voiceInputFor({ ua: UA.fbAndroid, ...on, apiPresent: false })).toBe('typed');
  });

  it('Android needs voice_android (D14)', () => {
    expect(voiceInputFor({ ua: UA.androidChrome, ...on })).toBe('none');
    expect(voiceInputFor({ ua: UA.androidChrome, ...on, androidOn: true })).toBe('mic');
  });

  it('nothing without the flag or, outside in-app, without the API', () => {
    expect(voiceInputFor({ ua: UA.fbIos, ...on, enabled: false })).toBe('none');
    expect(voiceInputFor({ ua: UA.macChrome, ...on, apiPresent: false })).toBe('none');
  });
});

describe('effectiveAnswerMode', () => {
  it('voice only when chosen, available and gradable', () => {
    expect(effectiveAnswerMode('voice', 'mic', true)).toBe('voice');
    expect(effectiveAnswerMode('voice', 'typed', true)).toBe('voice');
    expect(effectiveAnswerMode('choice', 'mic', true)).toBe('choice');
    expect(effectiveAnswerMode('voice', 'none', true)).toBe('choice');
  });

  it('falls back to choice when the question has no oral config', () => {
    expect(effectiveAnswerMode('voice', 'mic', false)).toBe('choice');
  });
});

describe('answerSurface (final review: latch per question)', () => {
  it('once answered, the question keeps the surface it was answered on', () => {
    expect(answerSurface('choice', 'voice')).toBe('choice');
    expect(answerSurface('voice', 'choice')).toBe('voice');
  });

  it('before answering, follows the current effective mode', () => {
    expect(answerSurface(null, 'voice')).toBe('voice');
    expect(answerSurface(null, 'choice')).toBe('choice');
  });
});

describe('isIOSDevice (spec D15)', () => {
  it('iPhone, and iPadOS that reports a Mac UA with touch', () => {
    expect(isIOSDevice(UA.iphoneSafari, 5)).toBe(true);
    expect(isIOSDevice(UA.fbIos, 5)).toBe(true);
    const ipadAsMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15';
    expect(isIOSDevice(ipadAsMac, 5)).toBe(true);
  });

  it('not Mac desktops or Android', () => {
    expect(isIOSDevice(UA.macChrome, 0)).toBe(false);
    expect(isIOSDevice(UA.androidChrome, 5)).toBe(false);
  });
});
