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
    expect(byId('whatmean')).toEqual({ badge: 'continue', ctaLabel: 'Tiếp tục học' });
  });
  it('started, low accuracy → needs-practice', () => {
    expect(byId('yesno')).toEqual({ badge: 'needs-practice', ctaLabel: 'Luyện ngay' });
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
  it('recommended brand-new module keeps the state verb Học ngay', () => {
    expect(decideModuleBadge(sig('civics', 0, 128), true).ctaLabel).toBe('Học ngay');
  });
  it('low accuracy below the attempt threshold stays continue, not needs-practice', () => {
    expect(decideModuleBadge(sig('whatmean', 2, 62, 2, 0), false).badge).toBe('continue');
  });
});

describe('buildStudyTip — chữa lỗi trước, mở rộng sau', () => {
  const base: StudyTipSignals = {
    topWrongModule: null,
    weakCategory: null,
    lowestModule: null,
    lowestCoverage: null,
  };

  it('leads with the module owing the most unreviewed wrongs, chunked — never exposes total debt', () => {
    const tip = buildStudyTip({
      ...base,
      topWrongModule: { id: 'civics', label: 'Civics', count: 56, href: '/practice?start=wrongs' },
    });
    expect(tip.line1).toContain('10 câu Civics');
    expect(tip.line1).not.toContain('56');
    expect(tip.href).toBe('/practice?start=wrongs');
  });
  it('shows the real count when the debt is smaller than a chunk', () => {
    const tip = buildStudyTip({
      ...base,
      topWrongModule: { id: 'civics', label: 'Civics', count: 4, href: '/practice?start=wrongs' },
    });
    expect(tip.line1).toContain('4 câu Civics');
  });
  it('section debt links to that module review session', () => {
    const tip = buildStudyTip({
      ...base,
      topWrongModule: { id: 'writing', label: 'Writing', count: 8, href: '/writing?start=wrongs' },
    });
    expect(tip.line1).toContain('8 câu Writing');
    expect(tip.href).toBe('/writing?start=wrongs');
  });
  it('ignores debt below the minimum and moves to the weak category', () => {
    const tip = buildStudyTip({
      ...base,
      topWrongModule: { id: 'civics', label: 'Civics', count: 2, href: '/practice?start=wrongs' },
      weakCategory: { label: 'American History' },
    });
    expect(tip.line1).toContain('American History');
    expect(tip.href).toBe('/practice?start=weak');
  });
  it('weak civics category deep-links straight into a focused session', () => {
    const tip = buildStudyTip({ ...base, weakCategory: { label: 'System of Government' } });
    expect(tip.line1).toContain('System of Government');
    expect(tip.href).toBe('/practice?start=weak');
  });
  it('falls back to lowest-accuracy module', () => {
    const tip = buildStudyTip({
      ...base,
      lowestModule: { label: 'Yes / No', accuracy: 33, href: '/speaking/yes-no' },
    });
    expect(tip.line1).toContain('33%');
    expect(tip.href).toBe('/speaking/yes-no');
  });
  it('expands the lowest-coverage module when nothing is weak', () => {
    const tip = buildStudyTip({
      ...base,
      lowestCoverage: { label: 'What Mean', done: 14, total: 62, href: '/speaking/what-mean' },
    });
    expect(tip.line1).toContain('14/62');
    expect(tip.href).toBe('/speaking/what-mean');
  });
  it('has a brand-new-user fallback', () => {
    expect(buildStudyTip(base).href).toBe('/study/civics');
  });
});
