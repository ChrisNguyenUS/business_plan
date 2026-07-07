import Image from 'next/image';
import { Bookmark, Pointer } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';

interface FlashcardFrontProps {
  questionId: number;
  questionEn: string;
  questionVi: string;
  audioSrc: string | null;
  bookmarked?: boolean;
  /** Omit to hide the bookmark control (Speaking/Writing sections don't bookmark). */
  onToggleBookmark?: () => void;
  /** Badge label; defaults to the civics "Câu hỏi / Question #id". */
  badge?: string;
}

export function FlashcardFront({
  questionId,
  questionEn,
  questionVi,
  audioSrc,
  bookmarked = false,
  onToggleBookmark,
  badge,
}: FlashcardFrontProps) {
  return (
    <div className="h-full rounded-[32px] bg-white shadow-[0_8px_40px_-12px_rgba(20,184,166,0.15)] border border-teal-50 flex flex-col p-[clamp(1rem,2vw,2rem)] relative group-hover:shadow-[0_16px_48px_-10px_rgba(20,184,166,0.22)] group-hover:-translate-y-0.5 transition-all duration-300 ease-out">
      {/* Pinned: Audio & Bookmark */}
      <div className="absolute top-[clamp(0.75rem,2vw,1.5rem)] right-[clamp(0.75rem,2vw,1.5rem)] flex items-center gap-2 sm:gap-3 z-20">
        <AudioButton src={audioSrc} label="Nghe câu hỏi" size="sm" />
        {onToggleBookmark ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onToggleBookmark();
              }
            }}
            aria-label="Đánh dấu"
            className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              bookmarked
                ? 'bg-amber-100 text-amber-500 shadow-sm shadow-amber-500/20'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
          </span>
        ) : null}
      </div>

      {/* Badge */}
      <div className="shrink-0 flex justify-center mb-[clamp(0.5rem,1vw,1.5rem)]">
        <span className="text-[clamp(0.55rem,1vw,0.75rem)] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full inline-flex">
          {badge ?? `Câu hỏi / Question #${questionId}`}
        </span>
      </div>

      {/* Statue Icon */}
      <div className="shrink-0 flex justify-center mb-[clamp(0.5rem,1vw,1.5rem)] pointer-events-none">
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 'clamp(2rem, 4vw, 4rem)',
            height: 'clamp(2rem, 4vw, 4rem)',
          }}
        >
          <div className="absolute inset-0 bg-teal-50/80 rounded-full blur-md" />
          <div className="relative w-3/4 h-3/4 opacity-95">
            <Image src="/images/n400/illu-studying.png" alt="" fill className="object-contain" sizes="80px" />
          </div>
        </div>
      </div>

      {/* Content Area — the only section that may scroll */}
      <div
        className="flex-1 min-h-0 flex flex-col justify-center items-center overflow-y-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* English Question */}
        <div className="text-center font-bold text-slate-800 leading-tight max-w-[24ch] mx-auto w-full" style={{ fontSize: 'clamp(1.2rem, 3vw, 2.25rem)' }}>
          {questionEn}
        </div>

        {/* Vietnamese Translation */}
        <div
          className="text-center text-slate-500 font-medium max-w-[36ch] mx-auto w-full mt-[clamp(0.5rem,1vw,1.5rem)]"
          style={{ fontSize: 'clamp(0.85rem, 2vw, 1.25rem)' }}
        >
          {questionVi}
        </div>
      </div>

      {/* Hint — always visible, never scrolls */}
      <div className="shrink-0 mt-auto pt-[clamp(0.5rem,1vw,1rem)] flex items-center justify-center">
        <div className="uppercase tracking-widest text-slate-400 font-bold text-center flex items-center gap-1.5" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)' }}>
          <Pointer size={16} className="text-slate-400 animate-bounce" />
          Nhấn vào thẻ để xem đáp án
        </div>
      </div>
    </div>
  );
}
