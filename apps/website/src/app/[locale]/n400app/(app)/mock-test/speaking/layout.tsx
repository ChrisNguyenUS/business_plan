import type { ReactNode } from 'react';

/**
 * Immersive layout for the Thi thử Speaking mock test.
 *
 * Mirrors the speaking section layouts: the page content NEVER scrolls, the
 * quiz is the only flexible area, and bottom controls stay anchored.
 */
export default function ThiThuSpeakingLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
