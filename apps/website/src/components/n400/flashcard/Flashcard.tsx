import { FlashcardFront } from './FlashcardFront';
import { FlashcardBack } from './FlashcardBack';

interface Answer {
  en: string;
  vi: string;
}

interface FlashcardProps {
  flipped: boolean;
  onFlip: () => void;
  questionId: number;
  questionEn: string;
  questionVi: string;
  questionAudioSrc: string | null;
  answerAudioSrc: string | null;
  answers: Answer[];
  bookmarked: boolean;
  onToggleBookmark: () => void;
}

/**
 * 3D-flipping Flashcard wrapper.
 *
 * Architectural notes:
 * - `absolute inset-0` is used ONLY for the 3D flip stacking.
 * - Visual styling (bg, border, shadow, rounded) lives inside
 *   FlashcardFront / FlashcardBack — not on the absolute wrappers.
 * - `will-change: transform` is safe here because only one
 *   Flashcard is rendered at a time.
 * - `motion-reduce:` disables animation for accessibility.
 */
export function Flashcard({
  flipped,
  onFlip,
  questionId,
  questionEn,
  questionVi,
  questionAudioSrc,
  answerAudioSrc,
  answers,
  bookmarked,
  onToggleBookmark,
}: FlashcardProps) {
  return (
    <div
      className="relative flex-1 min-h-0 w-full max-w-[900px] mx-auto"
      style={{
        perspective: 1200,
        minHeight: 'clamp(240px, 50vh, 320px)',
      }}
    >
      <button
        type="button"
        onClick={onFlip}
        aria-label="Lật thẻ"
        className="block w-full h-full outline-none text-left"
      >
        <div
          className="relative w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:duration-0 [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d]"
          style={{
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
          >
            <FlashcardFront
              questionId={questionId}
              questionEn={questionEn}
              questionVi={questionVi}
              audioSrc={questionAudioSrc}
              bookmarked={bookmarked}
              onToggleBookmark={onToggleBookmark}
            />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
            style={{
              transform: 'rotateY(180deg)',
            }}
          >
            <FlashcardBack
              audioSrc={answerAudioSrc}
              answers={answers}
            />
          </div>
        </div>
      </button>
    </div>
  );
}
