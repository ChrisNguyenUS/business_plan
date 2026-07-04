'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';

export function PersonalizedAnswerNotice({ from }: { from: 'practice' | 'flashcards' }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      <TriangleAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 leading-snug" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.8125rem)' }}>
        <span className="font-semibold text-amber-800">
          Đáp án cá nhân hóa chưa có / Personalized answer unavailable.
        </span>{' '}
        <span className="text-amber-700">
          Bạn chưa thêm địa chỉ — mọi Dân biểu đương nhiệm của tiểu bang đều được chấp nhận khi luyện tập.
        </span>{' '}
        <Link
          href={{ pathname: `/${locale}/n400app/setup`, query: { from } }}
          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
        >
          Thêm địa chỉ →
        </Link>
      </p>
    </div>
  );
}
