'use client';

// Segmented switcher shown on both Tiến độ pages. The split is by DEPTH, not
// by data type: /progress answers the three questions at a glance, /statistic
// explains them. The sidebar has a single "Tiến độ" entry, pointing at
// /progress. The two pages keep their existing URLs.

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export function ProgressTabs() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const tabs = [
    { href: `${base}/progress`, label: 'Tổng quan' },
    { href: `${base}/statistic`, label: 'Chi tiết' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => {
        const active = pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
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
