'use client';

/**
 * Header — Consistent page header across all N400 pages.
 *
 * Primary pages (lateral navigation):   Title + Streak + Avatar
 * Secondary pages (hierarchical):       Back + Title + Streak + Avatar
 *
 * No hamburger. No bookmark shortcut. No date range button.
 * The sidebar (desktop) and bottom nav (mobile) handle primary navigation.
 * The AvatarMenu handles secondary navigation.
 */

import { usePathname, useParams } from 'next/navigation';
import { ChevronLeft, Flame } from 'lucide-react';
import Link from 'next/link';
import { useN400UserState } from '@/lib/n400/user-state';
import { AvatarMenu } from './AvatarMenu';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '': { title: 'Tổng quan', subtitle: 'Chào mừng trở lại! 👋' },
  practice: {
    title: 'Luyện tập',
    subtitle: 'Trả lời và xem ngay đáp án đúng / sai',
  },
  'mock-test': {
    title: 'Thi thử',
    subtitle: 'Mô phỏng kỳ thi quốc tịch Mỹ (N-400) giống như kỳ thi thật.',
  },
  flashcards: {
    title: 'Flashcards',
    subtitle: 'Lật thẻ — học theo từng câu',
  },
  statistic: {
    title: 'Tiến độ học tập',
    subtitle: 'Theo dõi tiến độ và hiệu suất học tập của bạn',
  },
  profile: { title: 'Tài khoản' },
  categories: {
    title: 'Danh mục',
    subtitle: 'Khám phá và học tập theo các chủ đề đa dạng, bám sát kỳ thi N400.',
  },
  bookmark: { title: 'Đánh dấu', subtitle: 'Câu hỏi bạn đã lưu để ôn lại' },
};

/** Primary sections use lateral navigation (no Back button). */
const PRIMARY_SECTIONS = ['', 'practice', 'flashcards', 'mock-test'];

/**
 * Deterministic back navigation — navigate to logical parent, not browser history.
 * This creates predictable navigation regardless of how the user originally arrived.
 */
const PARENT_MAP: Record<string, string> = {
  profile: '',
  bookmark: '',
  statistic: '',
  categories: '',
  help: '',
  setup: '',
};

function detectSection(pathname: string | null, locale: string): string {
  if (!pathname) return '';
  const base = `/${locale}/n400app`;
  if (pathname === base || pathname === `${base}/`) return '';
  const rest = pathname.slice(base.length + 1);
  return rest.split('/')[0] ?? '';
}

export function Header() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;
  const section = detectSection(pathname, locale);
  const meta = TITLES[section] ?? TITLES[''];
  const isSecondary = !PRIMARY_SECTIONS.includes(section);

  // Deterministic back navigation
  const parentHref = PARENT_MAP[section];
  const backHref =
    parentHref !== undefined
      ? parentHref
        ? `${base}/${parentHref}`
        : base
      : base;

  const { state, hydrated } = useN400UserState();
  const streak = hydrated ? state.streak.current : 0;
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const activeToday = hydrated && state.streak.lastActivityDate === today && streak > 0;

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-gray-200/50 bg-slate-50/90 px-4 py-3 backdrop-blur-md lg:min-h-20 lg:px-8 lg:py-0">
      {/* Left: Back + Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isSecondary && (
          <Link
            href={backHref}
            aria-label="Quay lại"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-gray-800 lg:text-xl">{meta.title}</h2>
          {!isSecondary && meta.subtitle ? (
            <p className="mt-0.5 hidden text-sm text-gray-500 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>
      </div>

      {/* Right: Streak + Avatar */}
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        {/* Study streak badge */}
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition-colors lg:px-4 ${
            activeToday
              ? 'bg-orange-50 border-orange-100'
              : 'bg-white border-gray-100'
          }`}
          title={
            activeToday
              ? 'Bạn đã học hôm nay — chuỗi đang giữ vững.'
              : streak > 0
                ? 'Bạn chưa học hôm nay — học một câu để giữ chuỗi.'
                : 'Học hôm nay để bắt đầu chuỗi mới.'
          }
        >
          <Flame
            className={activeToday ? 'text-orange-500' : 'text-gray-300'}
            size={18}
          />
          <div className="flex min-w-0 flex-col">
            <span className="hidden text-[10px] font-medium leading-none text-gray-400 sm:block">
              Chuỗi học tập
            </span>
            <span
              className={`text-sm font-bold leading-tight whitespace-nowrap ${
                activeToday ? 'text-orange-700' : 'text-gray-800'
              }`}
            >
              {streak} ngày
            </span>
          </div>
        </div>

        {/* Avatar menu */}
        <AvatarMenu />
      </div>
    </header>
  );
}
