'use client';

/*
 * QuestionList — "Danh sách" view mode of the Flashcards page.
 * Renders the questions as a searchable, dense, scrollable reading list
 * (question, answer, audio, category chip, bookmark toggle).
 */

import { Bookmark, Search, ExternalLink } from 'lucide-react';
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
import { useN400Lang } from '@/lib/n400/i18n/provider';

const CATEGORY_TONE: Record<N400CategoryKey, { bg: string; text: string; chip: string; chipText: string }> = {
  principles: { bg: 'bg-teal-50', text: 'text-teal-600', chip: 'bg-teal-50', chipText: 'text-teal-700' },
  system: { bg: 'bg-orange-50', text: 'text-orange-500', chip: 'bg-orange-50 text-orange-600', chipText: 'text-orange-600' },
  rights: { bg: 'bg-yellow-50', text: 'text-yellow-600', chip: 'bg-yellow-50 text-yellow-700', chipText: 'text-yellow-700' },
  history: { bg: 'bg-purple-50', text: 'text-purple-600', chip: 'bg-purple-50 text-purple-700', chipText: 'text-purple-700' },
  symbols: { bg: 'bg-blue-50', text: 'text-blue-600', chip: 'bg-blue-50 text-blue-700', chipText: 'text-blue-700' },
};

interface QuestionListProps {
  questions: N400Question[];
  bookmarks: number[];
  onToggleBookmark: (id: number) => void;
  stateCode: StateCode;
  districtNumber: number | null;
  onSelectQuestion?: (id: number) => void;
}

export function QuestionList({
  questions,
  bookmarks,
  onToggleBookmark,
  stateCode,
  districtNumber,
  onSelectQuestion,
}: QuestionListProps) {
  const { dict, lang } = useN400Lang();
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
    <div className="space-y-2 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
      <label className="relative block mb-3">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.flashcards.searchPlaceholder}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
        />
      </label>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <h4 className="font-bold text-gray-800">{dict.flashcards.noResults}</h4>
          <p className="text-sm text-gray-500 mt-1">{dict.flashcards.noResultsHint}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((q) => {
            const tone = CATEGORY_TONE[q.category];
            const isBookmarked = bookmarks.includes(q.id);
            const correct = correctAnswersFor(q, stateCode, districtNumber);
            const answers = correct.length > 0
              ? correct
              : q.answersEn.map((en, i) => ({ en, vi: q.answersVi[i] ?? en }));

            return (
              <div
                key={q.id}
                onClick={() => onSelectQuestion?.(q.id)}
                className="group relative flex gap-3 items-start p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* Number ID */}
                <div className="font-mono text-sm font-bold text-slate-400 w-6 text-right shrink-0 mt-0.5">
                  #{q.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-slate-800 font-semibold text-sm leading-snug">
                    {q.questionEn}
                  </div>
                  {lang !== 'en' && (
                    <div className="text-slate-500 text-xs mt-0.5 leading-normal">
                      {q.questionVi}
                    </div>
                  )}

                  {/* Answers */}
                  <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-1">
                    <span className="font-semibold text-teal-700">Answer:</span>
                    {answers.map((a, i) => (
                      <span key={i} className="inline-flex items-center">
                        {i > 0 && <span className="text-slate-300 mx-1">•</span>}
                        <span className="font-medium text-slate-700">{a.en}</span>
                        {lang !== 'en' && a.vi && a.vi !== a.en && (
                          <span className="text-slate-400 ml-1">({a.vi})</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Topic tag */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 ${tone.chip} text-[10px] font-bold rounded`}>
                      {lang === 'en' ? N400_CATEGORY_LABELS[q.category].en : N400_CATEGORY_LABELS[q.category].vi}
                    </span>
                  </div>
                </div>

                {/* Actions (right side) */}
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {onSelectQuestion && (
                    <button
                      type="button"
                      title="Open in Flashcard"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectQuestion(q.id);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                  <AudioButton
                    src={questionAudioUrl(q.id)}
                    size="sm"
                    label={dict.flashcards.listenQuestion}
                    className="w-8 h-8 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(q.id);
                    }}
                    aria-label={isBookmarked ? dict.flashcards.unbookmark : dict.flashcards.bookmark}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                      isBookmarked
                        ? 'bg-amber-100 text-amber-500 shadow-sm'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                    }`}
                  >
                    <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
