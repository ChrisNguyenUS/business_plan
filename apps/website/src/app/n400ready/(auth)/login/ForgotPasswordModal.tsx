'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import styles from './forgot-password.module.css';

/** Deliberately permissive — the real check is the email Supabase sends. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Where the recovery link lands: the shared auth callback exchanges the
 *  recovery code for a session cookie, then forwards to the reset form. */
function resetRedirectUrl() {
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
    '/n400ready/reset-password'
  )}`;
}

function EnvelopeLockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="5" y="14" width="26" height="19" rx="4" stroke="#16A394" strokeWidth="2.2" />
      <path
        d="M5.5 17.5 18 26.2 30.5 17.5"
        stroke="#16A394"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="11" r="6.5" fill="#DFF7F3" stroke="#16A394" strokeWidth="2" />
      <path d="M28 10.6V9.4a2 2 0 1 1 4 0v1.2" stroke="#16A394" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="27.2" y="10.6" width="5.6" height="4.4" rx="1.2" fill="#16A394" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 8l9 5.5L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.75" r="1.15" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { dict } = useN400Lang();
  const t = dict.forgotPassword;

  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Esc closes; body scroll is locked while the dialog is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const onOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!modalRef.current?.contains(e.target as Node)) onClose();
    },
    [onClose]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guards double submit (Enter + click)

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t.invalidEmail);
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: resetRedirectUrl(),
    });
    setLoading(false);

    if (err) {
      setError(err.message || t.genericError);
      return;
    }
    setSent(true);
  }

  return (
    <div className={styles.overlay} onMouseDown={onOverlayMouseDown}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t.close}>
          <CloseIcon />
        </button>

        <div className={styles.iconBadge}>
          <EnvelopeLockIcon />
        </div>

        {sent ? (
          <>
            <h2 id={titleId} className={styles.title}>
              {t.successTitle}
            </h2>
            <p id={descId} className={styles.successBody} role="status">
              {t.successBody}
              <span className={styles.successEmail}>{email.trim()}</span>
            </p>
            <div className={styles.hint}>
              <InfoIcon className={styles.hintIcon} />
              <span>{t.spamHint}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.submitBtn} ${styles.fullBtn}`}
                onClick={onClose}
                autoFocus
              >
                {t.done}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className={styles.title}>
              {t.title}
            </h2>
            <p id={descId} className={styles.description}>
              {t.description}
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label className={styles.label} htmlFor="n400-forgot-email">
                {t.emailLabel}
              </label>
              <div className={styles.inputWrap}>
                <MailIcon className={styles.inputIcon} />
                <input
                  id="n400-forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  placeholder={t.emailPlaceholder}
                  aria-invalid={error ? true : undefined}
                  className={`${styles.input} ${error ? styles.inputError : ''}`}
                />
              </div>

              {error ? (
                <div className={styles.errorBox} role="alert">
                  {error}
                </div>
              ) : (
                <div className={styles.hint}>
                  <InfoIcon className={styles.hintIcon} />
                  <span>{t.spamHint}</span>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={onClose}
                  disabled={loading}
                >
                  {t.cancel}
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      {t.submitting}
                    </>
                  ) : (
                    t.submit
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
