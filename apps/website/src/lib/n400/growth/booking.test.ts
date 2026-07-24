import { describe, expect, it } from 'vitest';
import { topicForCta, validateBookingInput } from './booking';

describe('topicForCta', () => {
  it('maps writing/speaking coaching CTAs to their topics', () => {
    expect(topicForCta('s5_writing_help')).toBe('writing');
    expect(topicForCta('s6_speaking_help')).toBe('speaking');
  });
  it('maps the haven\'t-filed-yet support call to document_prep', () => {
    expect(topicForCta('s10_document_prep')).toBe('document_prep');
  });
  it('maps filing-stalled to n400_review and readiness/mock CTAs to interview_prep', () => {
    expect(topicForCta('s3_filing_stalled')).toBe('n400_review');
    expect(topicForCta('s1_mock_ready')).toBe('interview_prep');
    expect(topicForCta('s4_interview_soon')).toBe('interview_prep');
    expect(topicForCta('s9_final_review')).toBe('interview_prep');
  });
  it('defaults to n400_review when there is no source CTA', () => {
    expect(topicForCta(null)).toBe('n400_review');
  });
});

describe('validateBookingInput', () => {
  const good = { name: 'Chris Nguyen', phone: '+1 (713) 555-0100', preferredTime: 'weekday_evening', topic: 'interview_prep' };
  it('accepts a complete input and trims the name', () => {
    const v = validateBookingInput({ ...good, name: '  Chris Nguyen ' });
    expect(v).toEqual({ ok: true, value: { ...good, name: 'Chris Nguyen' } });
  });
  it.each([
    ['name', { ...good, name: '   ' }],
    ['name', { ...good, name: 'x'.repeat(121) }],
    ['phone', { ...good, phone: '12345' }],
    ['phone', { ...good, phone: 'call me' }],
    ['preferred_time', { ...good, preferredTime: 'midnight' }],
    ['topic', { ...good, topic: 'divorce_law' }],
  ])('rejects bad %s', (error, raw) => {
    expect(validateBookingInput(raw)).toEqual({ ok: false, error });
  });
});
