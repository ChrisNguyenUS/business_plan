import type { ReactNode } from 'react';

/**
 * Immersive layout for the Flashcards study page.
 *
 * This nested layout constrains the Flashcard page within its own
 * layout hierarchy, providing an isolated immersive experience:
 * - The page content NEVER scrolls (overflow: hidden).
 * - The Flashcard is the ONLY flexible area.
 * - Bottom study controls ALWAYS remain visible.
 *
 * The parent n400ready layout remains unchanged. Its pb-28 and
 * overflow-y-auto still apply to <main>, but this container's
 * overflow-hidden prevents any scrolling from propagating.
 *
 * This layout is applied automatically by Next.js to all
 * routes under /n400ready/flashcards/.
 */
export default function FlashcardsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {children}
    </div>
  );
}
