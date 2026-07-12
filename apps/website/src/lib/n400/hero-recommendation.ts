// Intent-based hero recommendation for the dashboard. Instead of always
// showing "câu #N trong 128", the hero answers one question — "What action
// creates the highest learning value right now?" — by walking a fixed
// priority ladder over the user's learning state:
//
//   1. start_civics     brand-new account, nothing attempted yet
//   2. review_mistakes  fresh mock-test wrongs (≤72h) not yet re-answered right
//   3. goal_complete    all daily goals done → convert momentum into a mock
//   4. first_mock       civics coverage ≥80% but never took a mock (diagnostic)
//   5. stale_section    a Speaking/Writing skill went cold ≥7 days
//   6. finish_civics    ≤20 unseen civics left → sprint to the finish line
//   7. continue_civics  default
//
// Pure module: the dashboard derives the signals and renders the result.
// All hrefs are relative to the n400app base (`/${locale}/n400app`).

import type { QuestionAttempt, MockResult } from './storage';
import type { SectionAttempt, SectionKey } from './section-progress';

export type HeroIntent =
  | 'start_civics'
  | 'review_mistakes'
  | 'goal_complete'
  | 'first_mock'
  | 'stale_section'
  | 'finish_civics'
  | 'continue_civics';

export interface HeroCta {
  label: string;
  href: string; // relative to the n400app base
}

export interface HeroRecommendation {
  intent: HeroIntent;
  emoji: string;
  title: string;
  subtitle: string;
  cta: HeroCta;
  secondary: HeroCta;
}

export interface HeroSignals {
  now: Date;
  civicsSeen: number;
  civicsTotal: number;
  attempts: readonly QuestionAttempt[];
  mockResults: readonly MockResult[];
  sectionAttempts: readonly SectionAttempt[];
  goalsDone: number;
  goalsTotal: number;
}

export const MOCK_REVIEW_WINDOW_HOURS = 72;
export const STALE_SECTION_DAYS = 7;
export const FINISH_CIVICS_THRESHOLD = 20;
export const FIRST_MOCK_MIN_PERCENT = 80;

const DAY_MS = 86_400_000;

const CONTINUE_CIVICS_CTA: HeroCta = { label: 'Tiếp tục học Civics', href: '/flashcards?filter=unknown' };
const PICK_CATEGORY_CTA: HeroCta = { label: 'Chọn chủ đề khác', href: '/categories' };

// Ordered by nudge priority when staleness ties: Writing is graded hardest in
// the real interview, so it wins over the two speaking drills.
const SECTION_META: { key: SectionKey; label: string; emoji: string; href: string }[] = [
  { key: 'writing', label: 'Writing', emoji: '✍️', href: '/writing' },
  { key: 'yesno', label: 'Yes / No', emoji: '🗣️', href: '/speaking/yes-no' },
  { key: 'whatmean', label: 'What Mean', emoji: '🗣️', href: '/speaking/what-mean' },
];

/**
 * Question ids the user got wrong in their most recent mock test (within the
 * review window) and has not answered correctly since. Order follows the mock.
 * Shared by the dashboard hero and the practice `?start=review` deep link so
 * both always agree on what "ôn lại câu sai" means.
 */
export function pendingMockReviewIds(
  mockResults: readonly MockResult[],
  attempts: readonly QuestionAttempt[],
  now: Date,
): number[] {
  if (mockResults.length === 0) return [];
  const latest = [...mockResults].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  )[mockResults.length - 1];
  const completedAt = new Date(latest.completedAt).getTime();
  if (now.getTime() - completedAt > MOCK_REVIEW_WINDOW_HOURS * 3_600_000) return [];

  const wrong: number[] = [];
  for (const r of latest.questionResults) {
    if (!r.wasCorrect && !wrong.includes(r.questionId)) wrong.push(r.questionId);
  }
  if (wrong.length === 0) return [];

  // Cleared when the LAST attempt after the mock is correct — a later wrong
  // answer re-opens the question.
  const lastAfterMock = new Map<number, boolean>();
  for (const a of attempts) {
    if (new Date(a.at).getTime() > completedAt) lastAfterMock.set(a.questionId, a.wasCorrect);
  }
  return wrong.filter((id) => lastAfterMock.get(id) !== true);
}

interface StaleSection {
  key: SectionKey;
  label: string;
  emoji: string;
  href: string;
  /** Days since the last attempt; null when the section was never started. */
  days: number | null;
}

function findStalestSection(
  sectionAttempts: readonly SectionAttempt[],
  now: Date,
  civicsSeen: number,
  civicsTotal: number,
): StaleSection | null {
  const lastAt = new Map<SectionKey, number>();
  for (const a of sectionAttempts) {
    const t = new Date(a.at).getTime();
    if (t > (lastAt.get(a.section) ?? 0)) lastAt.set(a.section, t);
  }
  // Never-started sections only become a nudge once the user is clearly
  // invested in the app (half of civics seen) — a brand-new user should not
  // be pushed sideways before building a core habit.
  const nudgeUnstarted = civicsTotal > 0 && civicsSeen >= Math.ceil(civicsTotal / 2);

  let best: StaleSection | null = null;
  let bestScore = 0;
  for (const meta of SECTION_META) {
    const last = lastAt.get(meta.key);
    if (last === undefined) {
      if (!nudgeUnstarted) continue;
      // Unstarted ranks at the threshold, so a genuinely stale started
      // section (bigger day count) always wins over it.
      if (best === null || STALE_SECTION_DAYS > bestScore) {
        best = { ...meta, days: null };
        bestScore = STALE_SECTION_DAYS;
      }
      continue;
    }
    const days = Math.floor((now.getTime() - last) / DAY_MS);
    if (days < STALE_SECTION_DAYS) continue;
    if (days > bestScore) {
      best = { ...meta, days };
      bestScore = days;
    }
  }
  return best;
}

export function recommendDailyHero(signals: HeroSignals): HeroRecommendation {
  const {
    now,
    civicsSeen,
    civicsTotal,
    attempts,
    mockResults,
    sectionAttempts,
    goalsDone,
    goalsTotal,
  } = signals;
  const remaining = Math.max(civicsTotal - civicsSeen, 0);
  const percent = civicsTotal === 0 ? 0 : (civicsSeen / civicsTotal) * 100;

  // 1. Brand-new account — one clear entry point, no branching choices.
  if (attempts.length === 0 && sectionAttempts.length === 0 && mockResults.length === 0) {
    return {
      intent: 'start_civics',
      emoji: '🇺🇸',
      title: 'Bắt đầu học Civics',
      subtitle: `Chinh phục ${civicsTotal} câu hỏi công dân — bắt đầu từ hôm nay!`,
      cta: { label: 'Bắt đầu học ngay', href: '/flashcards?filter=unknown' },
      secondary: PICK_CATEGORY_CTA,
    };
  }

  // 2. Fresh mock-test mistakes beat everything: error correction right after
  // a test is the highest-retention moment in the whole loop.
  const reviewIds = pendingMockReviewIds(mockResults, attempts, now);
  if (reviewIds.length > 0) {
    return {
      intent: 'review_mistakes',
      emoji: '📖',
      title: `Ôn lại ${reviewIds.length} câu bạn vừa trả lời sai`,
      subtitle: 'Sửa lỗi ngay sau bài thi thử giúp bạn nhớ lâu hơn.',
      cta: { label: 'Ôn lại câu sai', href: '/practice?start=review' },
      secondary: CONTINUE_CIVICS_CTA,
    };
  }

  // 3. Daily goals done — celebrate, then convert the momentum into a mock.
  if (goalsTotal > 0 && goalsDone >= goalsTotal) {
    return {
      intent: 'goal_complete',
      emoji: '🎉',
      title: 'Bạn đã hoàn thành mục tiêu hôm nay!',
      subtitle: 'Tuyệt vời! Thi thử ngay để kiểm tra năng lực của bạn.',
      cta: { label: 'Thi thử ngay', href: '/mock-test' },
      secondary: { label: 'Xem tiến độ', href: '/statistic' },
    };
  }

  // 4. High coverage but never mocked — a first mock is the best diagnostic
  // and feeds the review_mistakes loop above.
  if (mockResults.length === 0 && percent >= FIRST_MOCK_MIN_PERCENT) {
    return {
      intent: 'first_mock',
      emoji: '🚀',
      title: 'Bạn đã sẵn sàng để thi thử!',
      subtitle: `Bạn đã học ${civicsSeen}/${civicsTotal} câu Civics — thử sức với bài thi thử đầu tiên nhé.`,
      cta: { label: 'Thi thử ngay', href: '/mock-test' },
      secondary: CONTINUE_CIVICS_CTA,
    };
  }

  // 5. A required interview skill went cold.
  const stale = findStalestSection(sectionAttempts, now, civicsSeen, civicsTotal);
  if (stale) {
    return {
      intent: 'stale_section',
      emoji: stale.emoji,
      title:
        stale.days === null
          ? `Bạn chưa bắt đầu luyện ${stale.label}`
          : `Đã ${stale.days} ngày bạn chưa luyện ${stale.label}`,
      subtitle: 'Buổi phỏng vấn quốc tịch kiểm tra cả kỹ năng này — luyện một chút mỗi ngày nhé.',
      cta: { label: `Luyện ${stale.label}`, href: stale.href },
      secondary: CONTINUE_CIVICS_CTA,
    };
  }

  // 6. Sprint to the civics finish line.
  if (remaining > 0 && remaining <= FINISH_CIVICS_THRESHOLD) {
    return {
      intent: 'finish_civics',
      emoji: '🇺🇸',
      title: `Chỉ còn ${remaining} câu nữa để hoàn thành Civics`,
      subtitle: `Cố lên — bạn sắp học hết ${civicsTotal} câu hỏi công dân rồi!`,
      cta: { label: 'Tiếp tục học ngay', href: '/flashcards?filter=unknown' },
      secondary: PICK_CATEGORY_CTA,
    };
  }

  // 7. Default: keep going where you left off.
  if (remaining === 0) {
    return {
      intent: 'continue_civics',
      emoji: '📚',
      title: `Ôn lại ${civicsTotal} câu Civics`,
      subtitle: `Bạn đã học qua cả ${civicsTotal} câu — ôn lại để giữ vững kiến thức!`,
      cta: { label: 'Ôn lại ngay', href: '/flashcards' },
      secondary: PICK_CATEGORY_CTA,
    };
  }
  return {
    intent: 'continue_civics',
    emoji: '📚',
    title: 'Tiếp tục học Civics',
    subtitle: `Còn ${remaining} câu nữa để hoàn thành ${civicsTotal} câu hỏi công dân.`,
    cta: { label: 'Tiếp tục học ngay', href: '/flashcards?filter=unknown' },
    secondary: PICK_CATEGORY_CTA,
  };
}
