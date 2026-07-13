import type { ReactNode } from 'react';
import { N400UserStateProvider } from '@/lib/n400/user-state';

/**
 * Root layout for the entire /n400app segment.
 * Only wraps with the user-state provider (shared by both (app) and (auth) groups).
 * Sidebar, header, mobile-nav are delegated to the (app) sub-layout.
 */
export default function N400AppLayout({ children }: { children: ReactNode }) {
  return (
    <N400UserStateProvider>
      {children}
    </N400UserStateProvider>
  );
}
