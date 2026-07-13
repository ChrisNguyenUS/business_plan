import type { ReactNode } from 'react';

/**
 * N400 auth layout — completely standalone (no sidebar, header, or mobile-nav).
 * Login / signup pages render full-viewport with their own backgrounds.
 */
export default function N400AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
