'use client';

import { usePathname, useParams } from 'next/navigation';
import { Bookmark, ChevronDown, Flame, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useN400UserState } from '@/lib/n400/user-state';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '': { title: 'Tổng quan', subtitle: 'Chào mừng trở lại! 👋' },
  practice: {
    title: 'Luyện tập',
    subtitle: 'Trả lời và xem ngay đáp án đúng / sai',
  },
  'mock-test': {
    title: 'Thi thử',
    subtitle: '20 câu — đạt 12 câu để vượt qua, không xem đáp án giữa chừng',
  },
  flashcards: {
    title: 'Flashcards',
    subtitle: 'Lật thẻ — học theo từng câu',
  },
  statistic: {
    title: 'Thống kê',
    subtitle: 'Theo dõi tiến độ và hiệu suất học tập của bạn',
  },
  profile: { title: 'Hồ sơ' },
  categories: {
    title: 'Danh mục',
    subtitle: 'Khám phá và học tập theo các chủ đề đa dạng, bám sát kỳ thi N400.',
  },
  bookmark: { title: 'Đánh dấu', subtitle: 'Câu hỏi bạn đã lưu để ôn lại' },
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
  const section = detectSection(pathname, locale);
  const meta = TITLES[section] ?? TITLES[''];
  const showHamburger = section === 'practice' || section === 'bookmark';
  const showBookmark = section === 'practice';
  const { state, hydrated } = useN400UserState();
  const streak = hydrated ? state.streak.current : 0;
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const activeToday = hydrated && state.streak.lastActivityDate === today && streak > 0;

  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-start justify-between gap-3 border-b border-gray-200/50 bg-slate-50/90 px-4 py-4 backdrop-blur-md lg:h-20 lg:items-center lg:px-8 lg:py-0">
      <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center lg:gap-4">
        {showHamburger ? (
          <button type="button" className="mt-0.5 text-gray-500 hover:text-gray-800 lg:mt-0" aria-label="Menu">
            <Menu size={24} />
          </button>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight text-gray-800 lg:text-2xl">{meta.title}</h2>
          {meta.subtitle ? (
            <p className="mt-1 hidden text-sm text-gray-500 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-4">
        {showBookmark ? (
          <Link
            href={`/${locale}/n400app/bookmark`}
            aria-label="Đánh dấu"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-teal-600 sm:flex"
          >
            <Bookmark size={18} />
          </Link>
        ) : null}

        {section === 'statistic' && (
          <button
            type="button"
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 sm:flex"
          >
            01/05/2024 - 31/05/2024 <ChevronDown size={16} />
          </button>
        )}

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

        <Link
          href={`/${locale}/n400app/profile`}
          className="hidden cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm hover:bg-gray-50 lg:flex"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-full overflow-hidden">
            <Image
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="avatar"
              width={32}
              height={32}
              unoptimized
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium leading-none">Xin chào,</span>
            <span className="text-sm font-bold text-gray-800 leading-tight">Liberty Learner!</span>
          </div>
          <ChevronDown size={16} className="text-gray-400 ml-2" />
        </Link>
      </div>
    </header>
  );
}
