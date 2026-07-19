'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';

export function PersonalizedAnswerNotice({ from }: { from: 'practice' | 'flashcards' }) {
  const { dict } = useN400Lang();

  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 animate-in fade-in duration-300 motion-reduce:animate-none"
    >
      <TriangleAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 leading-snug" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.8125rem)' }}>
        <span className="font-semibold text-amber-800">
          {dict.common.personalizedAnswerUnavailable}.
        </span>{' '}
        <span className="text-amber-700">{dict.common.addressNotSetWarning}</span>{' '}
        <Link
          href={{ pathname: `/n400ready/setup`, query: { from } }}
          className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
        >
          {dict.common.addAddressLink}
        </Link>
      </p>
    </div>
  );
}
