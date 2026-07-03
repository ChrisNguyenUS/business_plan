'use client';

/**
 * AvatarMenu — Dropdown menu for secondary destinations.
 *
 * Desktop: Profile, Settings, Dark Mode, Logout (sidebar already shows Bookmarks/Statistics)
 * Mobile:  Profile, Bookmarks, Statistics, Settings, Dark Mode, Logout (single entry point)
 *
 * Accessibility: WAI-ARIA menu pattern with full keyboard navigation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronDown,
  User,
  Bookmark,
  BarChart2,
  Settings,
  Moon,
  LogOut,
} from 'lucide-react';

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Keyboard navigation: Escape, ArrowUp/Down, Home, End, Tab
  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const handler = (e: KeyboardEvent) => {
      if (!items || items.length === 0) return;
      const active = document.activeElement as HTMLElement;
      const idx = Array.from(items).indexOf(active);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Tab':
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          items[idx < items.length - 1 ? idx + 1 : 0]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          items[idx > 0 ? idx - 1 : items.length - 1]?.focus();
          break;
        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    };
    document.addEventListener('keydown', handler);
    // Focus first item when menu opens
    requestAnimationFrame(() => items?.[0]?.focus());
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const menuItemClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors outline-none focus:bg-gray-50';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors lg:gap-3 lg:px-4"
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
        <div className="hidden lg:flex flex-col">
          <span className="text-[10px] text-gray-400 font-medium leading-none">Xin chào,</span>
          <span className="text-sm font-bold text-gray-800 leading-tight">Liberty Learner!</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-[var(--motion-fast)] ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-gray-100 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-[var(--motion-fast)]"
        >
          {/* Account actions — desktop + mobile */}
          <Link
            href={`${base}/profile`}
            role="menuitem"
            tabIndex={-1}
            onClick={close}
            className={menuItemClass}
          >
            <User size={16} className="text-gray-400" />
            Hồ sơ
          </Link>

          {/* Secondary destinations — mobile only */}
          <div className="lg:hidden">
            <Link
              href={`${base}/bookmark`}
              role="menuitem"
              tabIndex={-1}
              onClick={close}
              className={menuItemClass}
            >
              <Bookmark size={16} className="text-gray-400" />
              Đánh dấu
            </Link>
            <Link
              href={`${base}/statistic`}
              role="menuitem"
              tabIndex={-1}
              onClick={close}
              className={menuItemClass}
            >
              <BarChart2 size={16} className="text-gray-400" />
              Thống kê
            </Link>
          </div>

          <div className="mx-3 my-1.5 border-t border-gray-100" />

          {/* Utilities — desktop + mobile */}
          <Link
            href={`${base}/profile`}
            role="menuitem"
            tabIndex={-1}
            onClick={close}
            className={menuItemClass}
          >
            <Settings size={16} className="text-gray-400" />
            Cài đặt
          </Link>

          <div
            role="menuitem"
            tabIndex={-1}
            onClick={() => setIsDarkMode(!isDarkMode)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsDarkMode(!isDarkMode);
              }
            }}
            className={`${menuItemClass} cursor-pointer justify-between`}
          >
            <span className="flex items-center gap-3">
              <Moon size={16} className="text-gray-400" />
              Chế độ tối
            </span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                isDarkMode ? 'bg-teal-600 justify-end' : 'bg-gray-200 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>

          <div className="mx-3 my-1.5 border-t border-gray-100" />

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={close}
            className={`${menuItemClass} text-red-600 hover:bg-red-50 focus:bg-red-50`}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
