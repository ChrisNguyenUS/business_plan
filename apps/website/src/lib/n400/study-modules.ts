// Study-page logic (the "Learning Launcher"). The Study page has ONE job:
// help the user pick and enter a learning module fast. It never repeats the
// dashboard's overall-progress hero or "continue learning" recommendation.
//
// Two pure concerns live here:
//   1. Smart status badge + CTA per module — exactly ONE badge each.
//   2. A single personalized tip strip at the bottom.
//
// The recommendation engine highlights ONE module but NEVER reorders the
// cards (fixed civics → what-mean → yes/no → writing order preserves muscle
// memory). All hrefs are relative to the n400app base (`/${locale}/n400app`).

export type StudyModuleId = 'civics' | 'whatmean' | 'yesno' | 'writing';

export type StudyBadgeKind =
  | 'recommended'
  | 'continue'
  | 'needs-practice'
  | 'completed'
  | 'new';

export interface StudyModuleSignal {
  id: StudyModuleId;
  /** Distinct items the user has seen/answered. */
  done: number;
  /** Total items in the module. */
  total: number;
  /** Graded attempts (correct + wrong) — flashcard toggles included. */
  gradedAttempts: number;
  /** Of those graded attempts, how many were correct. */
  correctAttempts: number;
}

export interface StudyModuleDecision {
  badge: StudyBadgeKind;
  /** Học ngay | Tiếp tục học | Ôn luyện lại | Luyện ngay */
  ctaLabel: string;
}

// A module is "Needs Practice" only with enough evidence — a couple of wrong
// answers on a brand-new module shouldn't brand it as weak.
export const NEEDS_PRACTICE_MAX_ACCURACY = 70;
export const NEEDS_PRACTICE_MIN_ATTEMPTS = 3;

export function modulePercent(sig: Pick<StudyModuleSignal, 'done' | 'total'>): number {
  return sig.total === 0 ? 0 : Math.round((sig.done / sig.total) * 100);
}

/** Accuracy 0–100, or null when the module has no graded attempts yet. */
export function moduleAccuracy(
  sig: Pick<StudyModuleSignal, 'gradedAttempts' | 'correctAttempts'>,
): number | null {
  return sig.gradedAttempts === 0
    ? null
    : Math.round((sig.correctAttempts / sig.gradedAttempts) * 100);
}

function isComplete(sig: StudyModuleSignal): boolean {
  return sig.total > 0 && sig.done >= sig.total;
}

/**
 * Which module deserves the spotlight. Principle: "finish what you're closest
 * to completing." We pick the started-but-incomplete module with the highest
 * completion; ties fall to array order (civics leads). This never changes the
 * card order — only which card gets the ⭐ badge and a stronger frame.
 */
export function pickRecommendedModule(signals: readonly StudyModuleSignal[]): StudyModuleId | null {
  if (signals.length === 0) return null;

  const startedIncomplete = signals.filter((s) => s.done > 0 && !isComplete(s));
  if (startedIncomplete.length > 0) {
    return startedIncomplete.reduce((best, s) =>
      modulePercent(s) > modulePercent(best) ? s : best,
    ).id;
  }

  // Nobody in progress → nudge the first unstarted module (array order).
  const unstarted = signals.find((s) => !isComplete(s));
  if (unstarted) return unstarted.id;

  // Everything is complete → review the core module.
  return signals[0].id;
}

/** The single badge + CTA for one card. Order encodes badge priority. */
export function decideModuleBadge(
  sig: StudyModuleSignal,
  isRecommended: boolean,
): StudyModuleDecision {
  const complete = isComplete(sig);

  if (isRecommended) {
    return {
      badge: 'recommended',
      ctaLabel: complete ? 'Ôn luyện lại' : sig.done > 0 ? 'Tiếp tục học' : 'Luyện ngay',
    };
  }
  if (complete) {
    return { badge: 'completed', ctaLabel: 'Ôn luyện lại' };
  }
  if (sig.done === 0) {
    return { badge: 'new', ctaLabel: 'Học ngay' };
  }

  const acc = moduleAccuracy(sig);
  if (
    acc !== null &&
    sig.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS &&
    acc < NEEDS_PRACTICE_MAX_ACCURACY
  ) {
    return { badge: 'needs-practice', ctaLabel: 'Học ngay' };
  }
  return { badge: 'continue', ctaLabel: 'Học ngay' };
}

// ─── Personalized tip strip ──────────────────────────────────────────────

export interface StudyTip {
  line1: string;
  line2: string;
  /** Relative to the n400app base. */
  href: string;
}

export interface StudyTipSignals {
  /** Civics topic the user gets wrong most; null when there's no clear one. */
  weakestCategory: { label: string; count: number } | null;
  /** A Speaking/Writing skill that went cold ≥7 days; null otherwise. */
  staleSection: { label: string; days: number; href: string } | null;
  /** Civics questions left to reach 128. */
  civicsRemaining: number;
  /** Lowest-accuracy started module, for the accuracy fallback. */
  lowestModule: { label: string; accuracy: number; href: string } | null;
}

export const WEAK_CATEGORY_MIN_WRONG = 2;
export const FINISH_CIVICS_THRESHOLD = 20;

/**
 * One dynamic tip, chosen from real learning data — never generic motivation.
 * Ladder mirrors "what would help most right now": fix a recurring weakness →
 * revive a stale skill → sprint to the civics finish → nudge low accuracy →
 * start the habit.
 */
export function buildStudyTip(s: StudyTipSignals): StudyTip {
  if (s.weakestCategory && s.weakestCategory.count >= WEAK_CATEGORY_MIN_WRONG) {
    return {
      line1: `Bạn thường sai các câu hỏi về ${s.weakestCategory.label}.`,
      line2: 'Luyện thêm 5 câu để cải thiện độ chính xác.',
      href: '/study/civics',
    };
  }
  if (s.staleSection) {
    return {
      line1: `Đã ${s.staleSection.days} ngày bạn chưa luyện ${s.staleSection.label}.`,
      line2: 'Luyện 1 câu để duy trì kỹ năng.',
      href: s.staleSection.href,
    };
  }
  if (s.civicsRemaining > 0 && s.civicsRemaining <= FINISH_CIVICS_THRESHOLD) {
    return {
      line1: `Bạn chỉ còn ${s.civicsRemaining} câu nữa để hoàn thành Civics.`,
      line2: 'Hoàn thành ngay hôm nay nhé!',
      href: '/study/civics',
    };
  }
  if (s.lowestModule) {
    return {
      line1: `Độ chính xác ${s.lowestModule.label} đang ở mức ${s.lowestModule.accuracy}%.`,
      line2: 'Luyện thêm vài câu để cải thiện độ chính xác nhé.',
      href: s.lowestModule.href,
    };
  }
  return {
    line1: 'Bắt đầu hành trình chinh phục 128 câu Civics.',
    line2: 'Luyện vài câu mỗi ngày để tạo thói quen học tập.',
    href: '/study/civics',
  };
}
