'use client';

import { usePathname, useParams } from 'next/navigation';
import { Bookmark, ChevronDown, Flame, Menu } from 'lucide-react';
import Image from 'next/image';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  '': { title: 'Tổng quan', subtitle: 'Chào mừng trở lại! 👋' },
  practice: { title: 'Luyện tập' },
  statistic: {
    title: 'Thống kê',
    subtitle: 'Theo dõi tiến độ và hiệu suất học tập của bạn',
  },
  profile: { title: 'Hồ sơ' },
  categories: {
    title: 'Danh mục',
    subtitle: 'Khám phá và học tập theo các chủ đề đa dạng, bám sát kỳ thi N400.',
  },
  bookmark: { title: 'Đánh dấu' },
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

  return (
    <header className="h-20 bg-slate-50/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {showHamburger ? (
          <button type="button" className="text-gray-500 hover:text-gray-800" aria-label="Menu">
            <Menu size={24} />
          </button>
        ) : null}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{meta.title}</h2>
          {meta.subtitle ? <p className="text-sm text-gray-500">{meta.subtitle}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showBookmark ? (
          <button
            type="button"
            aria-label="Đánh dấu"
            className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-teal-600 shadow-sm"
          >
            <Bookmark size={18} />
          </button>
        ) : null}

        {section === 'statistic' && (
          <button
            type="button"
            className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-50 shadow-sm"
          >
            01/05/2024 - 31/05/2024 <ChevronDown size={16} />
          </button>
        )}

        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-xl">
          <Flame className="text-orange-500" size={20} />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium leading-none">
              Chuỗi học tập
            </span>
            <span className="text-sm font-bold text-gray-800 leading-tight">7 ngày</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50">
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
        </div>
      </div>
    </header>
  );
}
