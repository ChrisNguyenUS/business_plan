'use client';

/**
 * Sidebar (desktop) + MobileNav (bottom navigation).
 *
 * Information Architecture:
 *   Primary:   Dashboard, Practice, Flashcards, Mock Test
 *   Secondary: Learning Progress
 *   Utilities: Account, Settings, Dark Mode, Logout
 *
 * Desktop: Permanent sidebar with grouped sections.
 * Mobile:  Bottom nav with 4 primary study features only.
 * Categories: Removed from navigation (now a study filter).
 * Bookmarks: merged into Flashcards (list view + filter).
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  CheckCircle,
  BarChart2,
  User,
  Settings,
  LogOut,
  Moon,
  Shield,
  ClipboardCheck,
  Layers,
  MessageCircleQuestion,
} from 'lucide-react';
import { useState } from 'react';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
};

/* ─── Navigation Groups ─── */

type NavGroup = { heading: string | null; items: MenuItem[] };

/** Desktop nav grouped by content area. Mobile keeps the flat 4-item bar. */
const DESKTOP_GROUPS: NavGroup[] = [
  { heading: null, items: [{ id: 'dashboard', label: 'Tổng quan', href: '', icon: Home }] },
  {
    heading: 'CIVICS (128 câu)',
    items: [
      { id: 'practice', label: 'Luyện tập', href: 'practice', icon: CheckCircle },
      { id: 'flashcards', label: 'Flashcards', href: 'flashcards', icon: Layers },
    ],
  },
  {
    heading: 'SPEAKING',
    items: [
      { id: 'whatmean', label: 'Câu hỏi What Mean', href: 'speaking/what-mean', icon: MessageCircleQuestion },
      { id: 'yesno', label: 'Câu hỏi Yes No', href: 'speaking/yes-no', icon: MessageCircleQuestion },
    ],
  },
  { heading: null, items: [{ id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck }] },
];

const SECONDARY_MENU: MenuItem[] = [
  { id: 'statistic', label: 'Tiến độ học tập', href: 'statistic', icon: BarChart2 },
];

/** Mobile bottom nav — only primary study features */
const MOBILE_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan', href: '', icon: Home },
  { id: 'practice', label: 'Luyện tập', href: 'practice', icon: CheckCircle },
  { id: 'flashcards', label: 'Flashcards', href: 'flashcards', icon: Layers },
  { id: 'mock-test', label: 'Thi thử', href: 'mock-test', icon: ClipboardCheck },
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
  const isActive = href === base ? pathname === base : pathname?.startsWith(href);
  const Icon = item.icon;

  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-[var(--motion-fast)] text-sm font-medium ${
        isActive
          ? 'bg-teal-50 text-teal-700 shadow-sm'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      <Icon size={18} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
      {item.label}
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

      {/* Primary navigation, grouped by content area */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        {DESKTOP_GROUPS.map((group, gi) => (
          <div key={group.heading ?? `g-${gi}`} className="space-y-1">
            {group.heading ? (
              <div className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {group.heading}
              </div>
            ) : null}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} base={base} pathname={pathname} />
            ))}
          </div>
        ))}

        {/* Divider */}
        <div className="!my-3 border-t border-gray-100" />

        {/* Secondary navigation */}
        {SECONDARY_MENU.map((item) => (
          <NavItem key={item.id} item={item} base={base} pathname={pathname} />
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
          const isActive =
            href === base ? pathname === base : pathname?.startsWith(href);
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
