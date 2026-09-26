import { describe, expect, it } from 'vitest';
import { WHATMEAN_QUESTIONS_BY_ID } from '../whatmean-data';
import { buildAllWhatMeanOralConfigs, buildWhatMeanOralConfig } from './build-whatmean-config';
import { WHATMEAN_ORAL_CONFIG } from './whatmean-oral-config.generated';

const cfg = (id: string) => buildWhatMeanOralConfig(WHATMEAN_QUESTIONS_BY_ID[id]);

describe('buildWhatMeanOralConfig — rules (speaking spec §3.1)', () => {
  it('up to 3 keywords: every keyword is required', () => {
    expect(cfg('wm-7')).toEqual({ type: 'single', alternatives: [['remove government force']] });
  });

  it('4+ keywords make a phrase needing ⌈2k/3⌉', () => {
    expect(cfg('wm-11')).toEqual({ type: 'phrase', alternatives: [['kill group people religion race']], minKeywords: 4 });
  });

  it('negations and digits are required exactly', () => {
    expect(cfg('wm-4')).toMatchObject({ mustInclude: ['not'] });
    expect(cfg('wm-44')).toMatchObject({ mustInclude: ['1'] });
  });

  it('a "/" separates alternatives', () => {
    expect(cfg('wm-62').alternatives).toEqual([['tell'], ['provide information']]);
  });

  it('examples after "such as" are not part of the definition', () => {
    expect(cfg('wm-23').alternatives).toEqual([['illegal drugs']]);
    expect(cfg('wm-30').alternatives).toEqual([['money government']]);
  });

  it('"or"-lists are explicit overrides: any one item', () => {
    expect(cfg('wm-9').alternatives).toEqual([['knife'], ['gun']]);
    expect(cfg('wm-39').alternatives).toEqual([['nursing'], ['cooking'], ['translation']]);
    expect(cfg('wm-46').alternatives).toEqual([['husband'], ['wife']]);
  });

  it('near-twins are kept apart (prototype cross-term matrix)', () => {
    expect(cfg('wm-14')).toMatchObject({ mustInclude: ['stay'] });
    expect(cfg('wm-15')).toMatchObject({ mustInclude: ['work'] });
    expect(cfg('wm-23')).toMatchObject({ mustExclude: ['equipment', 'tools'] });
    expect(cfg('wm-37')).toMatchObject({ mustExclude: ['not'] });
  });

  it('Exempt is graded by phrases, not by "not"/"something" (Gate S1)', () => {
    expect(cfg('wm-52')).toEqual({
      type: 'single',
      alternatives: [],
      phrases: ['not have to', 'not need to', 'not required'],
      mustExclude: ['true', 'know'],
    });
  });

  it('Vote keeps Register to vote out (Gate S1)', () => {
    expect(cfg('wm-3')).toMatchObject({ mustExclude: ['sign', 'register'] });
  });
});

describe('generated file', () => {
  it('matches the generator exactly (re-run: npx tsx scripts/n400/build-whatmean-oral-config.ts)', () => {
    expect(WHATMEAN_ORAL_CONFIG).toEqual(buildAllWhatMeanOralConfigs());
  });

  it('covers all 62 terms', () => {
    expect(Object.keys(WHATMEAN_ORAL_CONFIG)).toHaveLength(62);
  });
});
