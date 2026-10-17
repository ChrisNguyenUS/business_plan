import { describe, expect, it } from 'vitest';
import { STATES } from '../state-data';
import { buildStatePage } from './state-page';

describe('buildStatePage', () => {
  it('gives Texas its senators, district table, governor and capital', () => {
    const p = buildStatePage('TX', 'vi');
    expect(p.slug).toBe('texas');
    expect(p.answers.map((a) => a.questionId)).toEqual([23, 29, 61, 62]);
    expect(p.answers[0].answers).toEqual(['John Cornyn', 'Ted Cruz']);
    expect(p.answers[1].answers).toEqual([]);
    expect(p.districts.length).toBe(38);
    expect(p.districts[0]).toEqual({ label: '1', name: expect.any(String) });
    expect(p.answers[3].answers).toEqual(['Austin']);
    expect(p.answers.find((a) => a.star)?.questionId).toBe(61);
    expect(p.answers[0].question.toLowerCase()).toContain('thượng nghị sĩ');
    expect(p.answers[0].questionAlt.toLowerCase()).toContain('senator');
  });

  it('labels an at-large district "At-Large", never "0"', () => {
    const p = buildStatePage('WY', 'en');
    expect(p.districts).toEqual([{ label: 'At-Large', name: expect.any(String) }]);
  });

  it('uses the USCIS rules for D.C.', () => {
    const p = buildStatePage('DC', 'vi');
    expect(p.name).toBe('Washington, D.C.');
    expect(p.answers[0].answers).toEqual(['D.C. không có thượng nghị sĩ Hoa Kỳ']);
    expect(p.answers[1].answers).toEqual(['Eleanor Norton']);
    expect(p.answers[2].answers).toEqual(['D.C. không có thống đốc']);
    expect(p.answers[3].answers).toEqual(['D.C. không phải tiểu bang nên không có thủ phủ']);
    expect(p.districts).toEqual([]);
  });

  it('shows a territory delegate with the USCIS note, and its capital', () => {
    const p = buildStatePage('PR', 'en');
    expect(p.answers[1].answers).toEqual(['Pablo Hernandez']);
    expect(p.answers[1].note).toContain('no voting representative');
    expect(p.answers[3].answers).toEqual(['San Juan']);
  });

  it('never renders an empty or null answer on any of the 56 pages', () => {
    for (const s of STATES) {
      for (const locale of ['vi', 'en'] as const) {
        const p = buildStatePage(s.code, locale);
        for (const a of p.answers) {
          const shown = a.answers.length > 0 ? a.answers : p.districts.map((d) => d.name);
          expect(shown.length, `${s.code} Q${a.questionId}`).toBeGreaterThan(0);
          for (const text of shown) expect(text, `${s.code} Q${a.questionId}`).toMatch(/\S/);
          expect(JSON.stringify(a)).not.toMatch(/null"|undefined/);
        }
        expect(p.related).toHaveLength(6);
        expect(p.related.some((r) => r.slug === p.slug)).toBe(false);
      }
    }
  });
});
