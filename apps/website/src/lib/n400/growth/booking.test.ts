import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OPEN_CONSULTATION_STATUSES, alreadyRequestedVariant, topicForCta, validateBookingInput } from './booking';

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

describe('OPEN_CONSULTATION_STATUSES', () => {
  it('treats a booked consultation as still open (no second request, CTA parked)', () => {
    expect(OPEN_CONSULTATION_STATUSES).toEqual(['new', 'contacted', 'booked']);
  });

  it('is the only open-status list the booking and CTA readers use', () => {
    for (const file of ['booking-actions.ts', 'cta-state.ts']) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).toContain('OPEN_CONSULTATION_STATUSES');
      expect(src).not.toMatch(/\.in\(\s*['"]status['"]\s*,\s*\[\s*['"]/);
    }
  });
});

describe('alreadyRequestedVariant', () => {
  it('shows booked copy (no Calendly) only for a booked request', () => {
    expect(alreadyRequestedVariant('booked')).toBe('booked');
  });
  it('keeps pending copy for new/contacted/none', () => {
    expect(alreadyRequestedVariant('new')).toBe('pending');
    expect(alreadyRequestedVariant('contacted')).toBe('pending');
    expect(alreadyRequestedVariant(null)).toBe('pending');
  });
});
