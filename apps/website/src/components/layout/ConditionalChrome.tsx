'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const N400_RE = /^\/[a-z]{2}\/n400app(\/|$)/;

export function ConditionalChrome({
  navbar,
  footer,
  floating,
  children,
}: {
  navbar: ReactNode;
  footer: ReactNode;
  floating: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isN400App = N400_RE.test(pathname ?? '');

  if (isN400App) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {navbar}
      <main className="flex-1 pt-16 lg:pt-20">{children}</main>
      {footer}
      {floating}
    </div>
  );
}
