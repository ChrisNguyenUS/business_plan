'use client';

// Segmented switcher shown on both Tiến độ pages. The two pages keep their
// URLs (/statistic, /progress); the sidebar has a single "Tiến độ" entry.

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export function ProgressTabs() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const tabs = [
    { href: `${base}/statistic`, label: 'Thống kê' },
    { href: `${base}/progress`, label: 'Thành tích' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
