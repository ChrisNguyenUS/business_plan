import { AudioButton } from '@/components/n400/AudioButton';

interface Answer {
  en: string;
  vi: string;
}

interface FlashcardBackProps {
  audioSrc: string | null;
  answers: Answer[];
}

export function FlashcardBack({ audioSrc, answers }: FlashcardBackProps) {
  return (
    <div className="h-full rounded-[32px] bg-gradient-to-b from-teal-50/80 to-teal-100/50 shadow-[0_8px_40px_-12px_rgba(20,184,166,0.2)] border border-teal-100 flex flex-col p-[clamp(1rem,2vw,2rem)] relative hover:shadow-[0_16px_60px_-15px_rgba(20,184,166,0.25)] transition-shadow duration-500">
      {/* Pinned: Audio */}
      <div className="absolute top-[clamp(0.75rem,2vw,1.5rem)] right-[clamp(0.75rem,2vw,1.5rem)] flex items-center z-20">
        <AudioButton src={audioSrc} label="Nghe đáp án" size="sm" />
      </div>

      {/* Badge */}
      <div className="shrink-0 flex justify-center mb-[clamp(0.75rem,1.5vw,2rem)]">
        <span className="text-[clamp(0.55rem,1vw,0.75rem)] font-bold uppercase tracking-widest text-teal-700 bg-teal-100/50 px-3 py-1.5 rounded-full inline-flex">
          Đáp án / Answer
        </span>
      </div>

      {/* Content Area — the only section that may scroll */}
      <div
        className="flex-1 min-h-0 flex flex-col justify-center items-center overflow-y-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        <ul className="space-y-[clamp(0.75rem,1.5vw,1.5rem)] w-full text-center">
          {answers.map((a, i) => (
            <li key={i} className="flex flex-col items-center justify-center w-full">
              <div
                className="font-bold text-teal-800 leading-tight max-w-[24ch] mx-auto"
                style={{ fontSize: 'clamp(1.2rem, 3vw, 2.25rem)' }}
              >
                {a.en}
              </div>
              {a.vi !== a.en ? (
                <div
                  className="text-teal-600/80 font-medium max-w-[36ch] mx-auto mt-[clamp(0.25rem,0.5vw,0.75rem)]"
                  style={{ fontSize: 'clamp(0.85rem, 2vw, 1.25rem)' }}
                >
                  {a.vi}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* Hint — always visible, never scrolls */}
      <div className="shrink-0 mt-auto pt-[clamp(0.5rem,1vw,1rem)]">
        <div className="uppercase tracking-widest text-teal-400 font-bold text-center" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)' }}>
          Nhấn lại để quay về câu hỏi
        </div>
      </div>
    </div>
  );
}
