import { describe, expect, it } from 'vitest';
import { buildCivicsPersonalization, districtLabel } from './personalization';

describe('buildCivicsPersonalization', () => {
  it('resolves the full civics set for a known state + district', () => {
    const p = buildCivicsPersonalization('TX', 29, 'vi');
    expect(p).not.toBeNull();
    expect(p!.stateName).toBe('Texas');
    expect(p!.governor).toBe('Greg Abbott');
    expect(p!.capital).toBe('Austin');
    expect(p!.senators).toEqual(['John Cornyn', 'Ted Cruz']);
    expect(p!.representative).toBe('Sylvia Garcia');
    expect(p!.districtNumber).toBe(29);
  });

  it('localizes the state name', () => {
    expect(buildCivicsPersonalization('DC', null, 'vi')!.stateName).toBe('Washington, D.C.');
    expect(buildCivicsPersonalization('DC', null, 'en')!.stateName).toBe(
      'District of Columbia'
    );
  });

  it('keeps state facts but drops the rep when the district is ambiguous', () => {
    const p = buildCivicsPersonalization('TX', null, 'en')!;
    expect(p.representative).toBeNull();
    expect(p.districtNumber).toBeNull();
    expect(p.governor).toBe('Greg Abbott');
  });

  it('accepts a lowercase / padded state code', () => {
    expect(buildCivicsPersonalization(' tx ', 29, 'en')!.stateCode).toBe('TX');
  });

  it('returns null for an unknown state code', () => {
    expect(buildCivicsPersonalization('ZZ', 1, 'en')).toBeNull();
  });

  it('resolves at-large districts (districtNumber 0)', () => {
    const p = buildCivicsPersonalization('WY', 0, 'en')!;
    expect(p.representative).toBe('Harriet Hageman');
  });
});

describe('districtLabel', () => {
  it('formats a numbered district with the localized prefix', () => {
    expect(districtLabel(29, 'District')).toBe('District 29');
  });

  it('never renders "District 0" for at-large seats', () => {
    expect(districtLabel(0, 'District')).toBe('At-Large');
  });

  it('returns null when there is no district', () => {
    expect(districtLabel(null, 'District')).toBeNull();
  });
});
