import { describe, expect, it } from 'vitest';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { buildAllOralConfigs, buildOralConfig, echoExceptionIds, surnameOf } from './build-config';
import { ORAL_ANSWER_CONFIG } from './oral-answer-config.generated';

const cfg = (id: number) => buildOralConfig(N400_QUESTIONS_BY_ID.get(id)!);

describe('buildOralConfig — spec §3.1 examples', () => {
  it.each([
    [2, { type: 'single', alternatives: [['constitution']], mustExclude: ['father'] }],
    [16, { type: 'enumeration', alternatives: [['congress', 'president', 'courts']] }],
    [37, { type: 'single', alternatives: [['keep powerful']] }],
    [42, { type: 'single', alternatives: [['president']], mustExclude: ['vice', 'congress', 'courts'] }],
    [60, { type: 'phrase', alternatives: [['powers not given federal government belong states']], minKeywords: 5, mustInclude: ['not'] }],
    [102, { type: 'phrase', alternatives: [['after world war 1']], minKeywords: 3, mustInclude: ['after', '1'] }],
    [120, { type: 'single', alternatives: [['new york']] }],
  ])('Q%i', (id, expected) => {
    expect(cfg(id)).toEqual(expected);
  });
});

describe('buildOralConfig — rules', () => {
  it('person-name questions keep the surname only', () => {
    expect(cfg(38)).toEqual({ type: 'single', alternatives: [['trump']] });
    expect(cfg(39)).toEqual({ type: 'single', alternatives: [['vance']] });
  });

  it('question-echo drops keywords already in the question', () => {
    expect(cfg(40)).toEqual({ type: 'single', alternatives: [['vice']] });
    expect(cfg(52)).toEqual({ type: 'single', alternatives: [['supreme']] });
  });

  it('enumeration needs a counted question AND matching part count', () => {
    expect(cfg(15)?.type).toBe('single'); // "three branches ... Why?" → "Checks and balances" is one idea
    expect(cfg(119)?.type).toBe('single'); // "Washington, D.C." has a comma but no count
    expect(cfg(126)).toEqual({ type: 'enumeration', alternatives: [['new year', 'thanksgiving', 'christmas']] });
  });

  it('location-based questions are resolved at runtime, not generated', () => {
    for (const id of [23, 29, 61, 62]) expect(cfg(id)).toBeNull();
  });

  it('echo exceptions are exactly Q6 and Q76 (spec §3.1)', () => {
    expect(echoExceptionIds()).toEqual([6, 76]);
  });

  it('surnameOf strips suffixes', () => {
    expect(surnameOf('Martin Luther King, Jr.')).toBe('king');
    expect(surnameOf('JD Vance')).toBe('vance');
  });
});

describe('buildOralConfig — Gate 1 decisions (spec rev 3.2)', () => {
  it('a unit word after a number is optional', () => {
    expect(cfg(22)).toEqual({ type: 'single', alternatives: [['6']] });
    expect(cfg(25)).toEqual({ type: 'single', alternatives: [['2']] });
  });

  it('overrides block answers that belong to other questions', () => {
    expect(cfg(35)).toEqual({ type: 'single', alternatives: [['more people']] });
    expect(cfg(82)).toEqual({ type: 'single', alternatives: [['constitution']], mustExclude: ['father'] });
    expect(cfg(18)).toEqual({ type: 'single', alternatives: [['congress']], mustExclude: ['president', 'courts'] });
  });
});

describe('generated file', () => {
  it('matches the generator exactly (re-run: npx tsx scripts/n400/build-oral-config.ts)', () => {
    expect(ORAL_ANSWER_CONFIG).toEqual(buildAllOralConfigs());
  });

  it('covers every non-location question', () => {
    expect(Object.keys(ORAL_ANSWER_CONFIG)).toHaveLength(124);
  });
});
