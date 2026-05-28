'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { BadgeIcon } from './BadgeIcon';

interface BadgeMeta {
  slug: string;
  title_vi: string;
  title_en: string;
  description_vi: string;
  description_en: string;
  group_code: 'streak' | 'mock' | 'coverage' | 'volume' | 'category';
  sort_order: number;
}

interface UserBadge {
  slug: string;
  unlocked_at: string;
}

interface BadgeGalleryProps {
  catalog: BadgeMeta[];
  earned: UserBadge[];
}

const GROUP_LABELS: Record<BadgeMeta['group_code'], { vi: string; en: string }> = {
  streak: { vi: 'Chuỗi học tập', en: 'Streak' },
  mock: { vi: 'Thi thử', en: 'Mock test' },
  coverage: { vi: 'Bao phủ & thuộc bài', en: 'Coverage & mastery' },
  volume: { vi: 'Kiên trì', en: 'Persistence' },
  category: { vi: 'Thuộc theo danh mục', en: 'Category mastery' },
};

const GROUP_ORDER: BadgeMeta['group_code'][] = ['streak', 'mock', 'coverage', 'volume', 'category'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function BadgeGallery({ catalog, earned }: BadgeGalleryProps) {
  const [open, setOpen] = useState<BadgeMeta | null>(null);
  const earnedMap = new Map(earned.map((e) => [e.slug, e.unlocked_at]));

  const grouped = GROUP_ORDER.map((code) => ({
    code,
    badges: catalog
      .filter((b) => b.group_code === code)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const totalEarned = earned.filter((e) => catalog.some((c) => c.slug === e.slug)).length;
  const totalCatalog = catalog.length;

  return (
    <section id="badges" className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-gray-800">Huy hiệu / Badges</h3>
          <p className="text-xs text-gray-500 mt-1">
            Mở khóa khi bạn đạt cột mốc trong việc học. Đã mở: {totalEarned} / {totalCatalog}
          </p>
        </div>
        <div className="text-2xl font-bold text-teal-700">
          {totalEarned}
          <span className="text-sm text-gray-400 font-normal"> / {totalCatalog}</span>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(({ code, badges }) => (
          <div key={code}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {GROUP_LABELS[code].vi}{' '}
              <span className="text-gray-400 font-normal normal-case tracking-normal">
                / {GROUP_LABELS[code].en}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {badges.map((b) => {
                const isEarned = earnedMap.has(b.slug);
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => setOpen(b)}
                    className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors text-center"
                  >
                    <BadgeIcon slug={b.slug} alt={b.title_vi} size={64} earned={isEarned} />
                    <span
                      className={`text-[11px] font-medium leading-tight ${
                        isEarned ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {b.title_vi}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200"
          >
            <BadgeIcon slug={open.slug} alt={open.title_vi} size={120} earned={earnedMap.has(open.slug)} className="mx-auto" />
            <h4 className="mt-4 text-lg font-bold text-gray-800">{open.title_vi}</h4>
            <p className="text-xs text-gray-500">{open.title_en}</p>
            <p className="mt-3 text-sm text-gray-700">{open.description_vi}</p>
            <p className="text-xs text-gray-500 mt-1">{open.description_en}</p>
            {earnedMap.has(open.slug) ? (
              <p className="mt-4 text-xs text-teal-700 bg-teal-50 rounded-full inline-block px-3 py-1">
                Đã mở khóa: {formatDate(earnedMap.get(open.slug)!)}
              </p>
            ) : (
              <p className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-full inline-flex items-center gap-1.5 px-3 py-1">
                <Lock size={12} /> Chưa mở khóa
              </p>
            )}
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-5 w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
