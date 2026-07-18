'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { N400_LANGUAGES, type N400Lang } from '@/lib/n400/i18n/config';
import { setN400Language } from '@/lib/n400/i18n/actions';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import styles from './login.module.css';

const LABELS: Record<N400Lang, string> = { vi: 'VI', en: 'EN' };

/** VI/EN pill toggle on the login card. Cookie-only (logged out). */
export function LangToggle() {
  const { lang } = useN400Lang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: N400Lang) {
    if (next === lang || pending) return;
    startTransition(async () => {
      await setN400Language(next);
      router.refresh();
    });
  }

  return (
    <div className={styles.langToggle} role="group" aria-label="Language">
      {N400_LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          disabled={pending}
          className={code === lang ? styles.langToggleActive : styles.langToggleBtn}
          aria-pressed={code === lang}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
