import { describe, it, expect } from 'vitest';
import { WHATMEAN_PRESETS, YESNO_PRESETS } from './section-presets';

describe('section presets', () => {
  it('what mean: 5/10/20/full with spec minutes', () => {
    expect(WHATMEAN_PRESETS.map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 10, 5],
      ['deep', 20, 10],
      ['full', null, 30],
    ]);
  });

  it('yes no: 5/10/20/full with spec minutes', () => {
    expect(YESNO_PRESETS.map((p) => [p.id, p.count, p.minutes])).toEqual([
      ['quick', 5, 3],
      ['standard', 10, 5],
      ['deep', 20, 10],
      ['full', null, 20],
    ]);
  });
});
