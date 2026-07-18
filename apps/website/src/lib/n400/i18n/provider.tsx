'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { N400Lang } from './config';
import type { N400Dict } from './vi';

const N400LangContext = createContext<{ lang: N400Lang; dict: N400Dict } | null>(null);

export function N400LangProvider({
  lang,
  dict,
  children,
}: {
  lang: N400Lang;
  dict: N400Dict;
  children: ReactNode;
}) {
  return <N400LangContext.Provider value={{ lang, dict }}>{children}</N400LangContext.Provider>;
}

export function useN400Lang(): { lang: N400Lang; dict: N400Dict } {
  const ctx = useContext(N400LangContext);
  if (!ctx) throw new Error('useN400Lang must be used within N400LangProvider');
  return ctx;
}
