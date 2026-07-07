import type { ReactNode } from 'react';

/**
 * Immersive layout for the Writing (dictation) section.
 *
 * Mirrors the civics flashcards layout: the page content NEVER scrolls,
 * the dictation quiz is the only flexible area, and bottom controls stay
 * anchored. The parent n400app layout still applies its padding + overflow
 * to <main>, but this container's overflow-hidden prevents scrolling from
 * propagating.
 */
export default function WritingLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
