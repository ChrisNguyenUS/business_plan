'use client';

// Generic flip card for the Speaking/Writing sections. Same flip mechanics as
// the civics Flashcard (see that file for the reasoning behind FLIP_MS, the
// symmetric easing, and the visibility swap at FLIP_MS/2 — do not change one
// without the other). The two faces are caller-provided ReactNodes so What Mean
// (term↔definition) and Yes No (question↔meaning) render their own content on
// one shared card.

import type { ReactNode } from 'react';

const FLIP_MS = 500;
const FLIP_EASING = 'cubic-bezier(0.4, 0, 0.6, 1)'; // symmetric ease-in-out; 90° at FLIP_MS/2
const faceClass =
  'absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] motion-reduce:transition-none';
// visibility flips instantly, but only once the card has crossed 90°.
const faceTransition = { transition: `visibility 0s ${FLIP_MS / 2}ms` };

export function SectionFlashcard({
  flipped,
  onFlip,
  front,
  back,
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
}) {
  return (
    <div
      className="relative flex-1 min-h-0 w-full max-w-[900px] mx-auto"
      style={{ perspective: 1200, minHeight: 'clamp(240px, 50vh, 320px)' }}
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
        aria-label={flipped ? 'Lật lại mặt trước' : 'Lật xem đáp án'}
        className="block w-full h-full outline-none text-left cursor-pointer group"
      >
        <div
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
            className={`${faceClass} ${flipped ? 'invisible' : 'visible'}`}
            style={faceTransition}
            aria-hidden={flipped}
          >
            {front}
          </div>

          {/* Back face */}
          <div
            className={`${faceClass} ${flipped ? 'visible' : 'invisible'}`}
            style={{ transform: 'rotateY(180deg)', ...faceTransition }}
            aria-hidden={!flipped}
          >
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
