'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, List, Layers } from 'lucide-react';
import { SectionFlashcard } from '@/components/n400/flashcard/SectionFlashcard';
import { ProgressBar } from '@/components/n400/ui';

export interface DeckCard {
  id: string; // 'wm-<n>'
  front: React.ReactNode; // term + question + audio
  back: React.ReactNode; // definition + audio
  listPrimary: string; // term (list view left)
  listSecondary: string; // definition (list view right)
}

export function SectionFlashcardDeck({
  cards,
  known,
  onSetKnown,
  onExit,
  title,
}: {
  cards: DeckCard[];
  known: ReadonlySet<string>;
  onSetKnown: (id: string, known: boolean) => void;
  onExit: () => void;
  title: string;
}) {
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">Không có thẻ nào.</p>
        <button type="button" onClick={onExit} className="font-semibold text-teal-700">
          Quay lại
        </button>
      </div>
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const isKnown = known.has(card.id);

  const go = (delta: number) => {
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
    setFlipped(false);
  };

  const mark = (v: boolean) => {
    onSetKnown(card.id, v);
    if (index < cards.length - 1) go(1);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {/* Header row: back + title + view toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          ← {title}
        </button>
        <div className="flex gap-1 rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView('cards')}
            aria-label="Thẻ"
            className={`rounded-full p-1.5 ${view === 'cards' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400'}`}
          >
            <Layers size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label="Danh sách"
            className={`rounded-full p-1.5 ${view === 'list' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pb-4">
          {cards.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-800">{c.listPrimary}</div>
                {known.has(c.id) ? (
                  <span className="text-xs font-bold text-teal-600">Đã thuộc</span>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-gray-600">{c.listSecondary}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">
              {index + 1}/{cards.length}
            </span>
            <div className="flex-1">
              <ProgressBar progress={((index + 1) / cards.length) * 100} />
            </div>
          </div>

          {/* Card fills remaining space; flex parent so SectionFlashcard's flex-1 works. */}
          <div className="flex flex-1 min-h-0">
            <SectionFlashcard
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
              front={card.front}
              back={card.back}
            />
          </div>

          {/* Bottom controls: prev/next + known/unknown */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="rounded-xl border border-gray-200 p-3 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={() => mark(false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold ${isKnown ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}
              >
                <ThumbsDown size={16} /> Chưa thuộc
              </button>
              <button
                type="button"
                onClick={() => mark(true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold ${isKnown ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'}`}
              >
                <ThumbsUp size={16} /> Đã thuộc
              </button>
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === cards.length - 1}
              className="rounded-xl border border-gray-200 p-3 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
