'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  CheckCircle,
  BarChart2,
  User,
  Bookmark,
  Settings,
  LogOut,
  Moon,
  MapPin,
  Shield,
  ClipboardCheck,
  Layers,
} from 'lucide-react';
import { useState } from 'react';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
};

const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan', href: '', icon: Home },
  { id: 'practice', label: 'Luyện tập', href: 'practice', icon: CheckCircle },
  { id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck },
  { id: 'flashcards', label: 'Flashcards', href: 'flashcards', icon: Layers },
  { id: 'categories', label: 'Danh mục', href: 'categories', icon: MapPin },
  { id: 'bookmark', label: 'Đánh dấu', href: 'bookmark', icon: Bookmark },
  { id: 'statistic', label: 'Thống kê', href: 'statistic', icon: BarChart2 },
  { id: 'profile', label: 'Hồ sơ', href: 'profile', icon: User },
];

const MOBILE_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan', href: '', icon: Home },
  { id: 'practice', label: 'Luyện tập', href: 'practice', icon: CheckCircle },
  { id: 'statistic', label: 'Thống kê', href: 'statistic', icon: BarChart2 },
  { id: 'bookmark', label: 'Đánh dấu', href: 'bookmark', icon: Bookmark },
];

function useN400Navigation() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  return { base, pathname };
}

export function Sidebar() {
  const { base, pathname } = useN400Navigation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className="hidden lg:flex fixed z-20 h-full w-64 flex-col border-r border-gray-100 bg-white">
      <div className="p-6 flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center shadow-md">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-gray-800 leading-tight">N400 Ready</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            Tự tin chinh phục
            <br />
            giấc mơ Mỹ!
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        {MENU.map((item) => {
          const href = item.href ? `${base}/${item.href}` : base;
          const isActive =
            href === base ? pathname === base : pathname?.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-teal-50 text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-4">
        <div className="flex items-center justify-between px-2 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <Moon size={16} /> Chế độ tối
          </span>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle dark mode"
            className={`w-10 h-5 rounded-full p-0.5 flex items-center transition-colors ${
              isDarkMode ? 'bg-teal-600 justify-end' : 'bg-gray-200 justify-start'
            }`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 text-sm text-gray-500 pb-2">
          <Link
            href={`${base}/profile`}
            className="flex items-center gap-2 hover:text-gray-800"
          >
            <Settings size={16} /> Cài đặt
          </Link>
          <button type="button" className="flex items-center gap-2 hover:text-red-500">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const { base, pathname } = useN400Navigation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {MOBILE_MENU.map((item) => {
          const href = item.href ? `${base}/${item.href}` : base;
          const isActive =
            href === base ? pathname === base : pathname?.startsWith(href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={href}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
