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
  bookmarked?: boolean;
  /** Omit to hide the bookmark control (Speaking/Writing sections don't bookmark). */
  onToggleBookmark?: () => void;
  /** Front badge label; defaults to the civics "Câu hỏi / Question #id". */
  badge?: string;
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
 * - Browsers do NOT reliably cull a face's DESCENDANTS via
 *   `backface-visibility: hidden` (only the face's own background is
 *   culled), so the hidden face's content bleeds through mirrored.
 *   Each face is therefore also gated with `visibility`, swapped at
 *   the exact moment the card crosses 90°.
 * - CRITICAL: faces are gated with `opacity` IN ADDITION to
 *   `visibility`, and face content must NEVER use `transition-all`.
 *   `visibility` is inherited, so a descendant with `transition-all`
 *   (e.g. a hover-shadow card body) re-animates the inherited change
 *   and — per the CSS spec, a visibility transition keeps the element
 *   visible until it completes — stays painted ~300ms PAST the 90°
 *   swap: the outgoing face shows mirrored for the whole second half
 *   of the flip (verified in Chrome). `opacity` is NOT inherited;
 *   descendants cannot counteract an ancestor's opacity, so the
 *   opacity gate hides the subtree at exactly FLIP_MS / 2 no matter
 *   what transitions the face content declares. `pointer-events-none`
 *   keeps lagging descendants from being clickable while hidden.
 * - CRITICAL: the flip easing MUST be symmetric so that the geometric
 *   midpoint (90°) coincides with the temporal midpoint of the
 *   transition. `cubic-bezier(0.4,0,0.6,1)` is symmetric, so 90° is
 *   reached at FLIP_MS / 2, and the visibility swap is delayed by the
 *   same amount. A front-loaded easing (e.g. cubic-bezier(0.23,1,...))
 *   collapses the swap window to a few ms, and any frame jank then
 *   leaves the mirrored front face visible for a fraction of a second.
 *   If you change FLIP_MS or the easing, keep the easing symmetric and
 *   keep the swap delay at FLIP_MS / 2.
 * - CRITICAL: the rotating container is keyed by `questionId`. Parents
 *   reset `flipped` to false in the same render that swaps the question
 *   (goNext/goPrev/markKnown). Without the key, that reset runs the
 *   500ms flip transition on the SAME element, and the delayed
 *   visibility swap keeps the BACK face visible for the first
 *   FLIP_MS / 2 — flashing the answer face while navigating between
 *   cards. Remounting per question renders the new card statically at
 *   0° (initial styles never transition); only real flips animate.
 */
const FLIP_MS = 500;
const FLIP_EASING = 'cubic-bezier(0.4, 0, 0.6, 1)'; // symmetric ease-in-out
const faceClass =
  'absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] motion-reduce:transition-none';
// visibility + opacity flip instantly, but only once the card has crossed 90°.
const faceTransition = {
  transition: `visibility 0s ${FLIP_MS / 2}ms, opacity 0s ${FLIP_MS / 2}ms`,
};
const faceHidden = 'invisible opacity-0 pointer-events-none';
const faceShown = 'visible opacity-100';
export function Flashcard({
  flipped,
  onFlip,
  questionId,
  questionEn,
  questionVi,
  questionAudioSrc,
  answerAudioSrc,
  answers,
  bookmarked = false,
  onToggleBookmark,
  badge,
}: FlashcardProps) {
  return (
    <div
      className="relative flex-1 min-h-0 w-full max-w-[900px] mx-auto"
      style={{
        perspective: 1200,
        minHeight: 'clamp(240px, 50vh, 320px)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFlip();
          }
        }}
        aria-label="Lật thẻ"
        className="block w-full h-full outline-none text-left cursor-pointer group"
      >
        <div
          key={questionId}
          className="relative w-full h-full transition-transform motion-reduce:transition-none motion-reduce:duration-0 [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d]"
          style={{
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transitionDuration: `${FLIP_MS}ms`,
            transitionTimingFunction: FLIP_EASING,
            willChange: 'transform',
          }}
        >
          {/* Front face */}
          <div
            className={`${faceClass} ${flipped ? faceHidden : faceShown}`}
            style={faceTransition}
            aria-hidden={flipped}
          >
            <FlashcardFront
              questionId={questionId}
              questionEn={questionEn}
              questionVi={questionVi}
              audioSrc={questionAudioSrc}
              bookmarked={bookmarked}
              onToggleBookmark={onToggleBookmark}
              badge={badge}
            />
          </div>

          {/* Back face */}
          <div
            className={`${faceClass} ${flipped ? faceShown : faceHidden}`}
            style={{
              transform: 'rotateY(180deg)',
              ...faceTransition,
            }}
            aria-hidden={!flipped}
          >
            <FlashcardBack
              audioSrc={answerAudioSrc}
              answers={answers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
