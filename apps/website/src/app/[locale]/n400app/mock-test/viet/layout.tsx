import type { ReactNode } from 'react';

/**
 * Immersive layout for the Thi thử Viết (writing dictation) mock test.
 *
 * Mirrors the writing section layout: the page content NEVER scrolls, the
 * DictationQuiz is the only flexible area, and bottom controls stay anchored.
 */
export default function ThiThuVietLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}
