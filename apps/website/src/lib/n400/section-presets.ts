// Practice presets for the Speaking/Writing sections. Same 4 tier ids as
// civics (PracticeModesSheet keys its icons/colors off these ids) with counts
// scaled to each pool — the spec's "one practice theme across the app".

import type { PracticePreset } from './quiz-engine';
import type { N400Dict } from './i18n/vi';

export function whatmeanPresets(dict: N400Dict): PracticePreset[] {
  const p = dict.practice.presets;
  return [
    { id: 'quick', title: p.quick.title, desc: p.quick.desc, count: 5, minutes: 3 },
    { id: 'standard', title: p.whatmean.standard.title, desc: p.whatmean.standard.desc, count: 10, minutes: 5 },
    { id: 'deep', title: p.deep.title, desc: p.deep.desc, count: 20, minutes: 10 },
    { id: 'full', title: p.full.title, desc: p.whatmean.full.desc, count: null, minutes: 30 },
  ];
}

export function yesnoPresets(dict: N400Dict): PracticePreset[] {
  const p = dict.practice.presets;
  return [
    { id: 'quick', title: p.quick.title, desc: p.quick.desc, count: 5, minutes: 3 },
    { id: 'standard', title: p.yesno.standard.title, desc: p.yesno.standard.desc, count: 10, minutes: 5 },
    { id: 'deep', title: p.deep.title, desc: p.deep.desc, count: 20, minutes: 10 },
    { id: 'full', title: p.full.title, desc: p.yesno.full.desc, count: null, minutes: 20 },
  ];
}

export function writingPresets(dict: N400Dict): PracticePreset[] {
  const p = dict.practice.presets;
  return [
    { id: 'quick', title: p.quick.title, desc: p.writing.quick.desc, count: 5, minutes: 3 },
    { id: 'standard', title: p.writing.standard.title, desc: p.writing.standard.desc, count: 10, minutes: 5 },
    { id: 'deep', title: p.deep.title, desc: p.writing.deep.desc, count: 20, minutes: 10 },
    { id: 'full', title: p.full.title, desc: p.writing.full.desc, count: null, minutes: 30 },
  ];
}
