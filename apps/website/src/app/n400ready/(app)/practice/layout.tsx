import type { ReactNode } from 'react';

/**
 * Immersive layout for the Practice study page.
 *
 * Same architecture as flashcards/layout.tsx:
 * - The page content NEVER scrolls (overflow: hidden).
 * - The Study Body is the ONLY scrollable area.
 * - Bottom study controls ALWAYS remain visible.
 *
 * The parent n400ready layout remains unchanged.
 */
export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {children}
    </div>
  );
}
