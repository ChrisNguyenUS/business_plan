'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_N400_LANG, type N400Lang } from '@/lib/n400/i18n/config';
import { readN400LangCookie } from '@/lib/n400/i18n/client';
import { setN400Language } from '@/lib/n400/i18n/actions';

// The cookie never changes while the modal is open — subscribe is a no-op;
// useSyncExternalStore is here for its server/client snapshot split, which
// lets the preselection follow the cookie without a hydration mismatch.
const subscribeNoop = () => () => {};
const getServerLang = () => DEFAULT_N400_LANG;

/**
 * First-login language chooser. Rendered only while
 * n400_user_profile.ui_language IS NULL; confirming writes DB + cookie so
 * it never shows again. Deliberately bilingual and not dismissible.
 */
export function LanguageSelectModal() {
  const router = useRouter();
  const cookieLang = useSyncExternalStore(subscribeNoop, readN400LangCookie, getServerLang);
  // null = user hasn't tapped an option yet -> preselect from the cookie
  // (respects a language chosen on the login toggle before signup).
  const [tapped, setTapped] = useState<N400Lang | null>(null);
  const choice = tapped ?? cookieLang;
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function confirm() {
    if (pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const { ok } = await setN400Language(choice);
        if (!ok) {
          setFailed(true);
          return;
        }
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  const options: { code: N400Lang; label: string; sub: string; flag: string }[] = [
    { code: 'vi', label: 'Tiếng Việt', sub: 'Giao diện tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', sub: 'English interface', flag: '🇺🇸' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-800">Chọn ngôn ngữ hiển thị</h2>
        <p className="mt-0.5 text-sm text-gray-500">Choose your display language</p>

        <div className="mt-5 space-y-3">
          {options.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setTapped(opt.code)}
              aria-pressed={choice === opt.code}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                choice === opt.code
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{opt.flag}</span>
              <span className="flex-1">
                <span className="block font-semibold text-gray-800">{opt.label}</span>
                <span className="block text-xs text-gray-500">{opt.sub}</span>
              </span>
              {choice === opt.code && <span className="font-bold text-teal-600">✓</span>}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? '…' : 'Xác nhận / Confirm'}
        </button>
        {failed && (
          <p className="mt-3 text-center text-xs font-semibold text-red-600">
            Không lưu được — thử lại · Could not save — try again
          </p>
        )}
        <p className="mt-3 text-center text-xs text-gray-400">
          Bạn có thể đổi lại trong phần Tài khoản · You can change this later in Account
        </p>
      </div>
    </div>
  );
}
