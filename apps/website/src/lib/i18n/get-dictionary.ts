import type { Locale } from './config';

const dictionaries = {
  en: () => import('@/messages/en.json').then((module) => module.default),
  vi: () => import('@/messages/vi.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
