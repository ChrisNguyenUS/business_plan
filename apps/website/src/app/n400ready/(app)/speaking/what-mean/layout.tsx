import type { ReactNode } from 'react';

/**
 * Immersive layout for the What Mean Speaking section.
 *
 * Mirrors the civics flashcards layout: the page content NEVER scrolls,
 * the flashcard deck / practice is the only flexible area, and bottom
 * controls stay anchored. The parent n400ready layout still applies its
 * padding + overflow to <main>, but this container's overflow-hidden
 * prevents scrolling from propagating.
 */
export default function WhatMeanLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
