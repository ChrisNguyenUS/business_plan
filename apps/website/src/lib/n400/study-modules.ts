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
// memory). All hrefs are relative to the n400ready base (`/n400ready`).

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
  /**
   * Graded attempts (correct + wrong): practice and mock only. Flashcard
   * self-grades are NOT attempts (spec D1) — counting a "Đã thuộc" tap as a
   * correct answer would make a learner who never practises look flawless and
   * never get flagged weak.
   */
  gradedAttempts: number;
  /** Of those graded attempts, how many were correct. */
  correctAttempts: number;
}

export interface StudyModuleDecision {
  badge: StudyBadgeKind;
  /** Verb chuẩn theo state: Học ngay | Tiếp tục học | Luyện ngay | Ôn luyện lại. */
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

type StudyStateBadge = Exclude<StudyBadgeKind, 'recommended'>;

// CTA verb theo state của module — badge "recommended" không đổi verb,
// chỉ đổi khung/⭐ trên card.
const CTA_BY_STATE: Record<StudyStateBadge, string> = {
  completed: 'Ôn luyện lại',
  new: 'Học ngay',
  'needs-practice': 'Luyện ngay',
  continue: 'Tiếp tục học',
};

function decideStateBadge(sig: StudyModuleSignal): StudyStateBadge {
  if (isComplete(sig)) return 'completed';
  if (sig.done === 0) return 'new';

  const acc = moduleAccuracy(sig);
  if (
    acc !== null &&
    sig.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS &&
    acc < NEEDS_PRACTICE_MAX_ACCURACY
  ) {
    return 'needs-practice';
  }
  return 'continue';
}

/** The single badge + CTA for one card. Order encodes badge priority. */
export function decideModuleBadge(
  sig: StudyModuleSignal,
  isRecommended: boolean,
): StudyModuleDecision {
  const state = decideStateBadge(sig);
  return {
    badge: isRecommended ? 'recommended' : state,
    ctaLabel: CTA_BY_STATE[state],
  };
}

// ─── Personalized tip strip ──────────────────────────────────────────────

export interface StudyTip {
  line1: string;
  line2: string;
  /** Relative to the n400ready base. */
  href: string;
}

export interface StudyTipSignals {
  /**
   * Module with the most wrong-unreviewed items (graded modes only).
   * `href` must point at that module's review session deep link
   * (`/practice?start=wrongs` for civics, `<hub>?start=wrongs` for sections).
   */
  topWrongModule: { id: StudyModuleId; label: string; count: number; href: string } | null;
  /** Weakest civics category per recommendWeakCategory; null when none qualifies. */
  weakCategory: { label: string } | null;
  /** Lowest-accuracy started module. */
  lowestModule: { label: string; accuracy: number; href: string } | null;
  /** Lowest-coverage incomplete module; only set once the user has started something. */
  lowestCoverage: { label: string; done: number; total: number; href: string } | null;
}

export const TIP_MIN_WRONGS = 3;
export const TIP_REVIEW_CHUNK = 10;

/**
 * One dynamic tip — "chữa lỗi trước, mở rộng sau". The dashboard hero owns the
 * journey nudges (stale skills, civics sprint, mock tests); this ladder only
 * diagnoses weaknesses inside the study modules: pay down wrong-answer debt →
 * drill the weak civics topic → lift the lowest accuracy → expand coverage.
 * Debt is offered as a ≤10-question chunk; the total is never shown.
 */
export function buildStudyTip(s: StudyTipSignals): StudyTip {
  if (s.topWrongModule && s.topWrongModule.count >= TIP_MIN_WRONGS) {
    const n = Math.min(s.topWrongModule.count, TIP_REVIEW_CHUNK);
    return {
      line1: `Ôn lại ${n} câu ${s.topWrongModule.label} bạn trả lời sai.`,
      line2: 'Chỉ ~5 phút — xoá lỗi cũ giúp bạn nhớ lâu hơn.',
      href: s.topWrongModule.href,
    };
  }
  if (s.weakCategory) {
    return {
      line1: `Bạn thường sai chủ đề ${s.weakCategory.label}.`,
      line2: 'Luyện một bài tập trung để cải thiện độ chính xác.',
      href: '/practice?start=weak',
    };
  }
  if (s.lowestModule) {
    return {
      line1: `Độ chính xác ${s.lowestModule.label} đang ở mức ${s.lowestModule.accuracy}%.`,
      line2: 'Luyện thêm vài câu để cải thiện độ chính xác nhé.',
      href: s.lowestModule.href,
    };
  }
  if (s.lowestCoverage) {
    return {
      line1: `${s.lowestCoverage.label} mới học ${s.lowestCoverage.done}/${s.lowestCoverage.total} câu.`,
      line2: 'Học thêm vài câu mới hôm nay nhé.',
      href: s.lowestCoverage.href,
    };
  }
  return {
    line1: 'Bắt đầu hành trình chinh phục 128 câu Civics.',
    line2: 'Luyện vài câu mỗi ngày để tạo thói quen học tập.',
    href: '/study/civics',
  };
}
