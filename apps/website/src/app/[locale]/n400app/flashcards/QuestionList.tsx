'use client';

/*
 * QuestionList — "Danh sách" view mode of the Flashcards page.
 * Renders the questions already selected by the page-level filter chips
 * as a searchable, scrollable reading list (question, answer, audio,
 * category chip, bookmark toggle).
 */

import { Bookmark, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import {
  N400_CATEGORY_LABELS,
  type N400CategoryKey,
  type N400Question,
} from '@/lib/n400/questions-data';
import { questionAudioUrl, correctAnswersFor } from '@/lib/n400/quiz-engine';
import type { StateCode } from '@/lib/n400/state-data';

const CATEGORY_TONE: Record<N400CategoryKey, { bg: string; text: string; chip: string; chipText: string }> = {
  principles: { bg: 'bg-teal-50', text: 'text-teal-600', chip: 'bg-teal-50', chipText: 'text-teal-700' },
  system: { bg: 'bg-orange-50', text: 'text-orange-500', chip: 'bg-orange-50', chipText: 'text-orange-600' },
  rights: { bg: 'bg-yellow-50', text: 'text-yellow-500', chip: 'bg-yellow-50', chipText: 'text-yellow-600' },
  history: { bg: 'bg-purple-50', text: 'text-purple-600', chip: 'bg-purple-50', chipText: 'text-purple-700' },
  symbols: { bg: 'bg-blue-50', text: 'text-blue-600', chip: 'bg-blue-50', chipText: 'text-blue-700' },
};

interface QuestionListProps {
  /** Already filtered by the page-level filter chips. */
  questions: N400Question[];
  bookmarks: number[];
  onToggleBookmark: (id: number) => void;
  stateCode: StateCode;
  districtNumber: number | null;
}

export function QuestionList({
  questions,
  bookmarks,
  onToggleBookmark,
  stateCode,
  districtNumber,
}: QuestionListProps) {
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.id - b.id);
    if (!search.trim()) return sorted;
    const s = search.toLowerCase();
    return sorted.filter(
      (q) =>
        q.questionEn.toLowerCase().includes(s) ||
        q.questionVi.toLowerCase().includes(s) ||
        String(q.id) === s
    );
  }, [questions, search]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full animate-in fade-in duration-[var(--motion-fast)]">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm câu hỏi..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        />
      </label>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <h4 className="font-bold text-gray-800">Không có kết quả phù hợp</h4>
          <p className="text-sm text-gray-500 mt-1">Thử từ khóa khác hoặc xóa ô tìm kiếm.</p>
        </Card>
      ) : (
        items.map((q) => {
          const tone = CATEGORY_TONE[q.category];
          const isBookmarked = bookmarks.includes(q.id);
          const correct = correctAnswersFor(q, stateCode, districtNumber);
          const answers = correct.length > 0
            ? correct
            : q.answersEn.slice(0, 1).map((en, i) => ({ en, vi: q.answersVi[i] ?? en }));
          return (
            <Card
              key={q.id}
              className="flex gap-4 items-start p-6 hover:border-gray-300 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold ${tone.bg} ${tone.text}`}>
                {q.id}
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
                      onClick={() => onToggleBookmark(q.id)}
                      aria-label={isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${
                        isBookmarked
                          ? 'bg-amber-100 text-amber-500 shadow-sm shadow-amber-500/20'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                      }`}
                    >
                      <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
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
        })
      )}
    </div>
  );
}
