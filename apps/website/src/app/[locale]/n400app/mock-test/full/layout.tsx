import type { ReactNode } from 'react';

/**
 * Immersive layout for Phỏng vấn đầy đủ: content never scrolls the page;
 * each embedded quiz screen manages its own scroll area.
 */
export default function FullInterviewLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
