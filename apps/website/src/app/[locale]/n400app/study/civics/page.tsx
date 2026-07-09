'use client';

// Interim Civics hub. Plan 2 (skill hubs) replaces this page with the full
// hub module (Continue / Thẻ học / Luyện tập / Điểm yếu). Until then it only
// routes to the two existing Civics screens so the new navigation works.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Layers, ArrowRight } from 'lucide-react';

export default function CivicsHubPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const base = `/${locale}/n400app`;

  const items = [
    { href: `${base}/flashcards`, icon: Layers, title: 'Flashcards', desc: 'Lật thẻ — học theo từng câu.' },
    { href: `${base}/practice`, icon: CheckCircle, title: 'Luyện tập', desc: 'Trắc nghiệm và xem ngay đáp án.' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 animate-in fade-in duration-300">
      <h1 className="text-2xl font-extrabold text-gray-900">🇺🇸 Civics — 128 câu</h1>
      {items.map(({ href, icon: Icon, title, desc }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Icon size={22} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">{title}</div>
            <div className="text-sm text-gray-500">{desc}</div>
          </div>
          <ArrowRight size={18} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
        </Link>
      ))}
    </div>
  );
}
