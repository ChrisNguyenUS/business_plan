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
import { ChevronLeft, Flame, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useN400UserState } from '@/lib/n400/user-state';
import { useAuth } from '@/components/providers/AuthProvider';
import { getShortName } from '@/lib/profile-utils';
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
  study: { title: 'Học tập', subtitle: 'Chọn kỹ năng bạn muốn học và luyện tập.' },
  speaking: { title: 'Speaking' },
  writing: { title: 'Writing' },
  progress: { title: 'Tiến độ', subtitle: 'Huy hiệu và thành tích của bạn.' },
};

/** Primary sections use lateral navigation (no Back button). */
const PRIMARY_SECTIONS = ['', 'study', 'mock-test', 'statistic', 'progress'];

/**
 * Mock-test sub-routes get their own exam-serious header: "Mock Test – <mode>"
 * with a group icon + subtitle, and a Back chevron to the Thi thử hub. The hub
 * itself (bare /mock-test) keeps the primary "Thi thử" title from TITLES.
 */
const MOCK_SUBROUTES: Record<string, { title: string; subtitle: string }> = {
  full: {
    title: 'Mock Test – Full Interview',
    subtitle: 'Mô phỏng buổi phỏng vấn nhập tịch đầy đủ như thật.',
  },
  civics: {
    title: 'Mock Test – Civics',
    subtitle: 'Mô phỏng phần thi kiến thức công dân (Civics) như thật.',
  },
  speaking: {
    title: 'Mock Test – Speaking',
    subtitle: 'Mô phỏng phần phỏng vấn nói với viên chức USCIS.',
  },
  viet: {
    title: 'Mock Test – Writing',
    subtitle: 'Mô phỏng phần thi viết theo yêu cầu của viên chức USCIS.',
  },
};

/**
 * Deterministic back navigation — navigate to logical parent, not browser history.
 * This creates predictable navigation regardless of how the user originally arrived.
 */
const PARENT_MAP: Record<string, string> = {
  profile: '',
  categories: '',
  help: '',
  setup: '',
  practice: 'study/civics',
  flashcards: 'study/civics',
  speaking: 'study',
  writing: 'study',
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
  // Second path segment under /mock-test/<sub> selects the exam-specific header.
  const mockSub =
    section === 'mock-test' && pathname
      ? pathname.slice(base.length + 1).split('/')[1] ?? ''
      : '';
  const mockMeta = MOCK_SUBROUTES[mockSub];
  const isSecondary = mockMeta ? true : !PRIMARY_SECTIONS.includes(section);

  // Dashboard greets by name and time of day (per the dashboard redesign
  // mock); every other page keeps its static title. Falls back to the static
  // entry while the profile is still loading.
  const { profile } = useAuth();
  let meta = mockMeta ?? TITLES[section] ?? TITLES[''];
  if (section === '' && profile) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    meta = {
      title: `${greeting}, ${getShortName(profile)}! 👋`,
      subtitle: 'Sẵn sàng tiếp tục hành trình chinh phục quốc tịch Mỹ chưa?',
    };
  }

  // Deterministic back navigation. Mock sub-routes always return to the Thi thử
  // hub; everything else follows PARENT_MAP.
  const parentHref = PARENT_MAP[section];
  const backHref = mockMeta
    ? `${base}/mock-test`
    : parentHref !== undefined
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
  // The flame lights up whenever there's a live streak — not only on the days
  // the user has already studied. A streak that isn't "kept today yet" should
  // still read as ON FIRE, nudging the user to keep it going.
  const hasStreak = hydrated && streak > 0;

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
        {/* Mobile dashboard shows the brand instead of the page title (per
            the mobile mock); the greeting moved into the dashboard content. */}
        {section === '' && (
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="relative h-9 w-9 shrink-0">
              <Image src="/images/logo-transparent.png" alt="N400 Ready" fill className="object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold leading-tight text-gray-800">N400 Ready</h2>
              <p className="text-[11px] leading-tight text-gray-500">Giấc mơ Mỹ!</p>
            </div>
          </div>
        )}
        <div className={`min-w-0 ${section === '' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold leading-tight text-gray-800 lg:text-xl">{meta.title}</h2>
            {mockMeta ? <Users size={18} className="shrink-0 text-gray-400" aria-hidden /> : null}
          </div>
          {(!isSecondary || mockMeta) && meta.subtitle ? (
            <p className="mt-0.5 hidden text-sm text-gray-500 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>
      </div>

      {/* Right: Streak + Avatar */}
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        {/* Study streak badge */}
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition-colors lg:px-4 ${
            hasStreak
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
            className={hasStreak ? 'text-orange-500' : 'text-gray-300'}
            size={18}
          />
          <div className="flex min-w-0 flex-col">
            <span className="hidden text-[10px] font-medium leading-none text-gray-400 sm:block">
              Chuỗi học tập
            </span>
            <span
              className={`text-sm font-bold leading-tight whitespace-nowrap ${
                hasStreak ? 'text-orange-700' : 'text-gray-800'
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
