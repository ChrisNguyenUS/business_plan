'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Bookmark, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400State } from '@/lib/n400/storage';
import {
  N400_QUESTIONS,
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
} from '@/lib/n400/questions-data';
import { questionAudioUrl, correctAnswersFor } from '@/lib/n400/quiz-engine';

const CATEGORY_TONE: Record<N400CategoryKey, { bg: string; text: string; chip: string; chipText: string }> = {
  principles: { bg: 'bg-teal-50', text: 'text-teal-600', chip: 'bg-teal-50', chipText: 'text-teal-700' },
  system: { bg: 'bg-orange-50', text: 'text-orange-500', chip: 'bg-orange-50', chipText: 'text-orange-600' },
  rights: { bg: 'bg-yellow-50', text: 'text-yellow-500', chip: 'bg-yellow-50', chipText: 'text-yellow-600' },
  history: { bg: 'bg-purple-50', text: 'text-purple-600', chip: 'bg-purple-50', chipText: 'text-purple-700' },
  symbols: { bg: 'bg-blue-50', text: 'text-blue-600', chip: 'bg-blue-50', chipText: 'text-blue-700' },
};

export default function BookmarkPage() {
  const { state, hydrated, toggleBookmark } = useN400State();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [tab, setTab] = useState<'all' | N400CategoryKey>('all');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    let qs = N400_QUESTIONS.filter((q) => state.bookmarks.includes(q.id));
    if (tab !== 'all') qs = qs.filter((q) => q.category === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      qs = qs.filter(
        (q) =>
          q.questionEn.toLowerCase().includes(s) ||
          q.questionVi.toLowerCase().includes(s) ||
          String(q.id) === s
      );
    }
    return qs;
  }, [state.bookmarks, tab, search]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const counts = N400_QUESTIONS.reduce(
    (acc, q) => {
      if (state.bookmarks.includes(q.id)) {
        acc[q.category] = (acc[q.category] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<N400CategoryKey, number>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex gap-6 border-b border-gray-200 px-4 overflow-x-auto">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          Tất cả ({state.bookmarks.length})
        </TabButton>
        {(Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((cat) => (
          <TabButton key={cat} active={tab === cat} onClick={() => setTab(cat)}>
            {N400_CATEGORY_LABELS[cat].vi} ({counts[cat] ?? 0})
          </TabButton>
        ))}
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm trong câu đã đánh dấu..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        />
      </label>

      {items.length === 0 ? (
        <Card className="bg-teal-50/50 border-dashed border-2 border-teal-200 flex justify-between items-center p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
              <Bookmark size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">
                {state.bookmarks.length === 0
                  ? 'Bạn chưa đánh dấu câu hỏi nào'
                  : 'Không có kết quả phù hợp'}
              </h4>
              <p className="text-sm text-gray-500">
                Vào Luyện tập, nhấn biểu tượng dấu trang để lưu câu cần ôn lại.
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/n400app/practice`}
            className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-teal-700"
          >
            <Search size={16} /> Vào luyện tập
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((q) => {
            const tone = CATEGORY_TONE[q.category];
            const correct = correctAnswersFor(q, state.settings.stateCode);
            const answers = correct.length > 0
              ? correct
              : q.answersEn.slice(0, 1).map((en, i) => ({ en, vi: q.answersVi[i] ?? en }));
            return (
              <Card
                key={q.id}
                className="flex gap-4 items-start p-6 hover:border-gray-300 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone.bg} ${tone.text}`}>
                  <Bookmark size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-bold mb-1 ${tone.text}`}>Q. {q.id}</h4>
                      <p className="text-gray-800 font-medium">{q.questionEn}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{q.questionVi}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AudioButton src={questionAudioUrl(q.id)} size="sm" label="Nghe câu hỏi" />
                      <button
                        type="button"
                        onClick={() => toggleBookmark(q.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label="Xóa đánh dấu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="text-gray-500">Đáp án: </span>
                    {answers.map((a, i) => (
                      <span key={i}>
                        {i > 0 ? ', ' : ''}
                        <span className="font-medium">{a.en}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`px-3 py-1 ${tone.chip} ${tone.chipText} text-xs font-bold rounded-md`}>
                      {N400_CATEGORY_LABELS[q.category].vi}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-3 px-2 transition-colors whitespace-nowrap text-sm ${
        active
          ? 'border-b-2 border-teal-600 text-teal-600 font-bold'
          : 'text-gray-500 font-medium hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}
