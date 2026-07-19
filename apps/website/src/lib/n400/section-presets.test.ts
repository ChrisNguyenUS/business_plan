import { describe, it, expect } from 'vitest';
import { whatmeanPresets, yesnoPresets } from './section-presets';
import { vi } from './i18n/vi';

describe('section presets', () => {
  it('what mean: 5/10/20/full with spec minutes', () => {
    expect(whatmeanPresets(vi).map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 10, 5],
      ['deep', 20, 10],
      ['full', null, 30],
    ]);
  });

  it('yes no: 5/10/20/full with spec minutes', () => {
    expect(yesnoPresets(vi).map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 10, 5],
      ['deep', 20, 10],
      ['full', null, 20],
    ]);
  });
});
