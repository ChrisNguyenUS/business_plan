import { describe, expect, it } from 'vitest';
import { canAdvance, micLostFrom, mockItemInput, offersTypedFallback, toVoiceMockAnswers, voiceRunMicLost, type VoiceItem } from './mock-voice-items';

const item = (over: Partial<VoiceItem> = {}): VoiceItem => ({
  transcript: 'the constitution',
  retried: false,
  input: 'mic',
  confirmed: true,
  ...over,
});

describe('mock voice items (spec §6, §8, rev 3.4)', () => {
  it('mic lost switches the rest to typed', () => {
    expect(micLostFrom('not-allowed', true)).toBe(true);
    expect(micLostFrom('stalled', true)).toBe(true);
    expect(micLostFrom(null, false)).toBe(true);
    expect(micLostFrom('no-speech', true)).toBe(false);
    expect(micLostFrom('network', true)).toBe(false);
    expect(mockItemInput('mic', true)).toBe('typed');
    expect(mockItemInput('mic', false)).toBe('mic');
    expect(mockItemInput('typed', false)).toBe('typed');
  });

  it('advances only after a confirmed answer (voice) or a pick (choice)', () => {
    expect(canAdvance(true, item(), null)).toBe(true);
    expect(canAdvance(true, item({ confirmed: false }), null)).toBe(false);
    expect(canAdvance(true, null, 'A')).toBe(false);
    expect(canAdvance(false, null, 'A')).toBe(true);
    expect(canAdvance(false, null, null)).toBe(false);
  });

  it('builds answers without any verdict: transcripts for voice items, picks otherwise', () => {
    expect(
      toVoiceMockAnswers(
        [2, 62, 7],
        [item({ retried: true }), null, item({ confirmed: false })],
        [null, 'C', null],
      ),
    ).toEqual([
      { qid: 2, transcript: 'the constitution', retried: true, input: 'mic' },
      { qid: 62, selected: 'C' },
    ]);
  });
});

describe('typed fallback offer (final review: network / audio-capture mid-test)', () => {
  it('offers typing when the mic keeps failing for reasons a retry may not fix', () => {
    expect(offersTypedFallback('network')).toBe(true);
    expect(offersTypedFallback('audio-capture')).toBe(true);
    expect(offersTypedFallback('no-speech')).toBe(false);
    expect(offersTypedFallback(null)).toBe(false);
  });
});

describe('voiceRunMicLost (speaking spec §5.1, final review)', () => {
  it('a mic that disabled itself is lost, though its input now reads none', () => {
    // service-not-allowed / instant not-allowed: supported goes false, so voiceInputFor gives 'none'.
    expect(voiceRunMicLost('none', 'unavailable', false)).toBe(true);
  });

  it('a deaf or denied mic is lost; a passing error is not', () => {
    expect(voiceRunMicLost('mic', 'stalled', true)).toBe(true);
    expect(voiceRunMicLost('mic', 'not-allowed', true)).toBe(true);
    expect(voiceRunMicLost('mic', 'no-speech', true)).toBe(false);
    expect(voiceRunMicLost('mic', null, true)).toBe(false);
  });

  it('in-app browsers type from the start, so there is no mic to lose', () => {
    expect(voiceRunMicLost('typed', 'unavailable', false)).toBe(false);
  });
});

