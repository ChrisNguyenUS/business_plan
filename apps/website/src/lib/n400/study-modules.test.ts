import { describe, it, expect } from 'vitest';
import {
  pickRecommendedModule,
  decideModuleBadge,
  buildStudyTip,
  modulePercent,
  moduleAccuracy,
  type StudyModuleSignal,
  type StudyTipSignals,
} from './study-modules';

const sig = (
  id: StudyModuleSignal['id'],
  done: number,
  total: number,
  gradedAttempts = 0,
  correctAttempts = 0,
): StudyModuleSignal => ({ id, done, total, gradedAttempts, correctAttempts });

// The reference-mock state: civics 112/128, what-mean 9/62, yes/no 10/37
// (low accuracy), writing 45/45 complete.
const REFERENCE: StudyModuleSignal[] = [
  sig('civics', 112, 128, 200, 180),
  sig('whatmean', 9, 62, 9, 8),
  sig('yesno', 10, 37, 12, 4), // 33% accuracy → needs practice
  sig('writing', 45, 45, 45, 45),
];

describe('modulePercent / moduleAccuracy', () => {
  it('rounds percent and guards total=0', () => {
    expect(modulePercent({ done: 112, total: 128 })).toBe(88);
    expect(modulePercent({ done: 5, total: 0 })).toBe(0);
  });
  it('returns null accuracy with no graded attempts', () => {
    expect(moduleAccuracy({ gradedAttempts: 0, correctAttempts: 0 })).toBeNull();
    expect(moduleAccuracy({ gradedAttempts: 12, correctAttempts: 4 })).toBe(33);
  });
});

describe('pickRecommendedModule', () => {
  it('spotlights the started module closest to completion (reference → civics)', () => {
    expect(pickRecommendedModule(REFERENCE)).toBe('civics');
  });
  it('nudges the first unstarted module when nothing is in progress', () => {
    const fresh = [sig('civics', 0, 128), sig('whatmean', 0, 62)];
    expect(pickRecommendedModule(fresh)).toBe('civics');
  });
  it('falls back to the core module when everything is complete', () => {
    const done = [sig('civics', 128, 128), sig('whatmean', 62, 62)];
    expect(pickRecommendedModule(done)).toBe('civics');
  });
  it('returns null with no modules', () => {
    expect(pickRecommendedModule([])).toBeNull();
  });
});

describe('decideModuleBadge — exactly one badge per card', () => {
  const rec = pickRecommendedModule(REFERENCE)!;
  const byId = (id: StudyModuleSignal['id']) =>
    decideModuleBadge(REFERENCE.find((s) => s.id === id)!, id === rec);

  it('recommended module → recommended + Tiếp tục học', () => {
    expect(byId('civics')).toEqual({ badge: 'recommended', ctaLabel: 'Tiếp tục học' });
  });
  it('started, healthy accuracy → continue', () => {
    expect(byId('whatmean')).toEqual({ badge: 'continue', ctaLabel: 'Học ngay' });
  });
  it('started, low accuracy → needs-practice', () => {
    expect(byId('yesno')).toEqual({ badge: 'needs-practice', ctaLabel: 'Học ngay' });
  });
  it('finished module → completed + Ôn luyện lại', () => {
    expect(byId('writing')).toEqual({ badge: 'completed', ctaLabel: 'Ôn luyện lại' });
  });
  it('never-opened module → new', () => {
    expect(decideModuleBadge(sig('whatmean', 0, 62), false)).toEqual({
      badge: 'new',
      ctaLabel: 'Học ngay',
    });
  });
  it('recommended brand-new module uses Luyện ngay', () => {
    expect(decideModuleBadge(sig('civics', 0, 128), true).ctaLabel).toBe('Luyện ngay');
  });
  it('low accuracy below the attempt threshold stays continue, not needs-practice', () => {
    expect(decideModuleBadge(sig('whatmean', 2, 62, 2, 0), false).badge).toBe('continue');
  });
});

describe('buildStudyTip — dynamic ladder', () => {
  const base: StudyTipSignals = {
    weakestCategory: null,
    staleSection: null,
    civicsRemaining: 0,
    lowestModule: null,
  };

  it('leads with a recurring weakness', () => {
    const tip = buildStudyTip({
      ...base,
      weakestCategory: { label: 'System of Government', count: 5 },
    });
    expect(tip.line1).toContain('System of Government');
    expect(tip.href).toBe('/study/civics');
  });
  it('ignores a weak category below the wrong-count threshold', () => {
    const tip = buildStudyTip({
      ...base,
      weakestCategory: { label: 'System of Government', count: 1 },
      civicsRemaining: 16,
    });
    expect(tip.line1).toContain('16 câu');
  });
  it('surfaces a stale section before the civics sprint', () => {
    const tip = buildStudyTip({
      ...base,
      staleSection: { label: 'Writing', days: 8, href: '/writing' },
      civicsRemaining: 16,
    });
    expect(tip.line1).toContain('8 ngày');
    expect(tip.href).toBe('/writing');
  });
  it('nudges the civics finish line when close', () => {
    const tip = buildStudyTip({ ...base, civicsRemaining: 16 });
    expect(tip.line1).toContain('16 câu');
  });
  it('falls back to lowest-accuracy module', () => {
    const tip = buildStudyTip({
      ...base,
      lowestModule: { label: 'Yes / No', accuracy: 33, href: '/speaking/yes-no' },
    });
    expect(tip.line1).toContain('33%');
    expect(tip.href).toBe('/speaking/yes-no');
  });
  it('has a non-generic final fallback', () => {
    expect(buildStudyTip(base).href).toBe('/study/civics');
  });
});
