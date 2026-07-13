import type { ReactNode } from 'react';

/**
 * Immersive layout for the Yes/No Speaking section.
 *
 * Mirrors the civics flashcards layout: the page content NEVER scrolls,
 * the flashcard deck / practice is the only flexible area, and bottom
 * controls stay anchored. The parent n400app layout still applies its
 * padding + overflow to <main>, but this container's overflow-hidden
 * prevents scrolling from propagating.
 */
export default function YesNoLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
