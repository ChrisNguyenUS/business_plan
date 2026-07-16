'use client';

/**
 * Sidebar (desktop) + MobileNav (bottom navigation).
 *
 * Information Architecture (4 top-level areas):
 *   Tổng quan · Học tập (→ /study skill picker) · Thi thử · Tiến độ
 *   Utilities: Settings, Dark Mode, Logout
 *
 * Desktop: Permanent sidebar — each area is a card with title + subtitle and
 * a chevron, separated by dividers (per the IA redesign mock).
 * Mobile:  Bottom nav with the same 4 areas.
 * alsoMatch: skill hubs and legacy routes (speaking, writing, practice,
 * flashcards) keep the Học tập item highlighted instead of being destinations.
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  BarChart2,
  Settings,
  LogOut,
  Moon,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';
import { useState } from 'react';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  /** Second line shown on the desktop sidebar card. */
  subtitle?: string;
  /** Extra n400app-relative path prefixes that also count as active. */
  alsoMatch?: string[];
};

/* ─── Navigation ─── */

const DESKTOP_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    subtitle: 'Xem tổng quan quá trình học của bạn.',
    href: '',
    icon: Home,
  },
  {
    id: 'study',
    label: 'Học tập',
    subtitle: 'Học và luyện tập theo từng kỹ năng.',
    href: 'study',
    icon: GraduationCap,
    alsoMatch: ['speaking', 'writing', 'practice', 'flashcards'],
  },
  {
    id: 'mock-test',
    label: 'Thi thử',
    subtitle: 'Thi thử như kỳ thi thật, đánh giá năng lực.',
    href: 'mock-test',
    icon: ClipboardCheck,
  },
  {
    id: 'tiendo',
    label: 'Tiến độ',
    subtitle: 'Theo dõi tiến độ và mức sẵn sàng phỏng vấn.',
    href: 'progress',
    icon: BarChart2,
    alsoMatch: ['statistic'],
  },
];

/** Mobile bottom nav — the same four top-level areas as desktop. */
const MOBILE_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan', href: '', icon: Home },
  { id: 'study', label: 'Học tập', href: 'study', icon: GraduationCap, alsoMatch: ['speaking', 'writing', 'practice', 'flashcards'] },
  { id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck },
  { id: 'tiendo', label: 'Tiến độ', href: 'progress', icon: BarChart2, alsoMatch: ['statistic'] },
];

function useN400Navigation() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  return { base, pathname };
}

function NavItem({ item, base, pathname }: { item: MenuItem; base: string; pathname: string | null }) {
  const href = item.href ? `${base}/${item.href}` : base;
  const extraActive = (item.alsoMatch ?? []).some((m) => pathname?.startsWith(`${base}/${m}`));
  const isActive = (href === base ? pathname === base : pathname?.startsWith(href)) || extraActive;
  const Icon = item.icon;

  return (
    <Link
      href={href}
      className={`group flex w-full items-start gap-3 rounded-2xl px-4 py-4 transition-colors duration-[var(--motion-fast)] ${
        isActive ? 'bg-teal-50 shadow-sm' : 'hover:bg-gray-50'
      }`}
    >
      <Icon
        size={20}
        className={`mt-0.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-bold ${
            isActive ? 'text-teal-700' : 'text-gray-800'
          }`}
        >
          {item.label}
        </span>
        {item.subtitle ? (
          <span className={`mt-0.5 block text-xs leading-relaxed ${isActive ? 'text-teal-700/70' : 'text-gray-500'}`}>
            {item.subtitle}
          </span>
        ) : null}
      </span>
      <ChevronRight
        size={16}
        className={`mt-1 shrink-0 ${isActive ? 'text-teal-500' : 'text-gray-300 group-hover:text-gray-400'}`}
      />
    </Link>
  );
}

export function Sidebar() {
  const { base, pathname } = useN400Navigation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className="hidden lg:flex fixed z-20 h-full w-64 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 mb-2">
        <div className="w-10 h-10 relative flex-shrink-0">
          <Image src="/images/logo-transparent.png" alt="Manna One Solution" fill className="object-contain" />
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

      {/* Primary navigation — 4 top-level areas separated by dividers */}
      <nav className="flex-1 overflow-y-auto px-4">
        {DESKTOP_MENU.map((item, i) => (
          <div key={item.id} className={i > 0 ? 'border-t border-gray-100 pt-2 mt-2' : ''}>
            <NavItem item={item} base={base} pathname={pathname} />
          </div>
        ))}
      </nav>

      {/* Bottom utilities */}
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
          const extraActive = (item.alsoMatch ?? []).some((m) => pathname?.startsWith(`${base}/${m}`));
          const isActive = (href === base ? pathname === base : pathname?.startsWith(href)) || extraActive;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={href}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors duration-[var(--motion-fast)] ${
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
