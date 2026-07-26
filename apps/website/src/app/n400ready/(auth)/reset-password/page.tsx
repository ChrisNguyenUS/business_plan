'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { LangToggle } from '../login/LangToggle';
import shell from '../login/login.module.css';
import styles from './reset-password.module.css';

const LOGIN_URL = '/n400ready/login';
const LOGIN_SUCCESS_URL = `${LOGIN_URL}?reset=success`;

/* ─── Password policy — the checklist in the card is the single source ─── */
type RuleId = 'length' | 'case' | 'number' | 'symbol';

const RULES: { id: RuleId; test: (v: string) => boolean }[] = [
  { id: 'length', test: (v) => v.length >= 8 },
  { id: 'case', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'number', test: (v) => /\d/.test(v) },
  { id: 'symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_SEGMENTS = 5;
const STRENGTH_CLASS = [
  '',
  styles.strengthBarWeak,
  styles.strengthBarFair,
  styles.strengthBarGood,
  styles.strengthBarStrong,
];

/** 0–5: one point per satisfied rule, plus one for a comfortably long password. */
function strengthScore(password: string) {
  if (!password) return 0;
  const met = RULES.filter((r) => r.test(password)).length;
  return Math.min(STRENGTH_SEGMENTS, met + (password.length >= 12 ? 1 : 0));
}

/* ─── Icons ─── */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      {off && <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 12.3l2.6 2.6 5-5.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
type Status = 'verifying' | 'ready' | 'invalid' | 'success';

export default function N400ResetPasswordPage() {
  const { dict } = useN400Lang();
  const t = dict.resetPassword;

  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery session is established by /api/auth/callback (which exchanges
  // the emailed code for a session cookie) before this page renders. Newer
  // links may instead surface it here as a PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus((s) => (s === 'verifying' ? 'ready' : s));
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setStatus((s) => (s === 'verifying' ? (data.session ? 'ready' : 'invalid') : s));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const ruleState = useMemo(
    () => RULES.map((r) => ({ id: r.id, met: r.test(password) })),
    [password]
  );
  const allRulesMet = ruleState.every((r) => r.met);
  const score = strengthScore(password);

  const ruleLabels: Record<RuleId, string> = {
    length: t.ruleLength,
    case: t.ruleCase,
    number: t.ruleNumber,
    symbol: t.ruleSymbol,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guards double submit

    if (!allRulesMet) {
      setError(t.tooWeak);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setLoading(false);
      setError(err.message || t.genericError);
      return;
    }

    setStatus('success');
    // The recovery session has served its purpose — sign out so the user
    // re-authenticates with the new password.
    await supabase.auth.signOut();
    window.location.href = LOGIN_SUCCESS_URL;
  }

  return (
    <div className={shell.page}>
      <div className={shell.desktopBg} aria-hidden="true" />

      {/* ─── MOBILE HERO ─── */}
      <div className={shell.mobileHero}>
        <div className={shell.mobileHeroBg}>
          <Image
            src="/images/n400/login thumbnail/mobile-login-background.png"
            alt=""
            fill
            className={shell.mobileHeroBgImg}
            priority
          />
        </div>
        <div className={shell.mobileHeroContent}>
          <div className={shell.brand}>
            <Image
              src="/images/logo-official.png"
              alt="Manna One Solution"
              width={32}
              height={32}
              className={shell.logo}
            />
            <div className={shell.brandText}>
              <span className={shell.brandName}>
                N400 <span className={shell.brandAccent}>Ready</span>
              </span>
              <span className={shell.brandTagline}>{dict.login.tagline}</span>
            </div>
          </div>
          <div className={shell.mobileHeadline}>
            <h1>
              {t.headline1}<br />
              <strong>{t.headline2}</strong> <strong>{t.headline3}</strong>
            </h1>
          </div>
          <p className={shell.mobileHeroSub}>{t.heroSub}</p>
        </div>
      </div>

      <div className={shell.desktopMain}>
        {/* ─── DESKTOP LEFT PANEL ─── */}
        <div className={shell.leftPanel}>
          <div className={shell.leftContent}>
            <div className={shell.brand}>
              <Image
                src="/images/logo-official.png"
                alt="Manna One Solution"
                width={40}
                height={40}
                className={shell.logo}
              />
              <div className={shell.brandText}>
                <span className={shell.brandName}>
                  N400 <span className={shell.brandAccent}>Ready</span>
                </span>
                <span className={shell.brandTagline}>{dict.login.tagline}</span>
              </div>
            </div>

            <div className={shell.heroTextGroup}>
              <div className={shell.heroHeadline}>
                <h1>
                  {t.headline1}<br />
                  <strong>{t.headline2}</strong><br />
                  <strong>{t.headline3}</strong>
                </h1>
              </div>
              <p className={shell.heroSub}>{t.heroSub}</p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL / CARD ─── */}
        <div className={shell.rightPanel}>
          <div className={shell.loginCard}>
            <LangToggle />

            <div className={shell.cardHeader}>
              <Image
                src="/images/logo-official.png"
                alt="Manna One Solution"
                width={48}
                height={48}
                className={shell.cardLogo}
              />
            </div>

            {status === 'verifying' && (
              <div className={styles.statusBlock}>
                <span className={styles.statusSpinner} />
                <p className={styles.statusText}>{t.verifying}</p>
              </div>
            )}

            {status === 'invalid' && (
              <>
                <h1 className={shell.cardTitle}>{t.cardTitle}</h1>
                <div className={shell.errorBox} role="alert">{t.invalidLink}</div>
                <Link href={LOGIN_URL} className={shell.signInBtn} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  {t.backToLogin}
                </Link>
              </>
            )}

            {status === 'success' && (
              <div className={styles.statusBlock}>
                <span className={styles.successBadge}>
                  <SuccessIcon />
                </span>
                <h1 className={shell.cardTitle}>{t.successTitle}</h1>
                <p className={styles.statusText} role="status">{t.successBody}</p>
              </div>
            )}

            {status === 'ready' && (
              <>
                <h1 className={shell.cardTitle}>{t.cardTitle}</h1>
                <p className={shell.cardSubtitle}>{t.cardSubtitle}</p>

                {error && (
                  <div className={shell.errorBox} role="alert">{error}</div>
                )}

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  {/* New password */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="n400-new-password">
                      {t.newPasswordLabel}
                    </label>
                    <div className={styles.inputWrap}>
                      <input
                        id="n400-new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        autoComplete="new-password"
                        autoFocus
                        disabled={loading}
                        placeholder={t.newPasswordPlaceholder}
                        className={`${shell.input} ${styles.passwordInput}`}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t.hidePassword : t.showPassword}
                        aria-pressed={showPassword}
                      >
                        <EyeIcon off={showPassword} />
                      </button>
                    </div>
                  </div>

                  {/* Strength meter */}
                  <div className={styles.strength}>
                    <span className={styles.strengthLabel}>{t.strengthLabel}</span>
                    <div className={styles.strengthBars} aria-hidden="true">
                      {Array.from({ length: STRENGTH_SEGMENTS }, (_, i) => (
                        <span
                          key={i}
                          className={`${styles.strengthBar} ${
                            i < score ? STRENGTH_CLASS[Math.min(score, 4)] : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="n400-confirm-password">
                      {t.confirmPasswordLabel}
                    </label>
                    <div className={styles.inputWrap}>
                      <input
                        id="n400-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value);
                          if (error) setError(null);
                        }}
                        autoComplete="new-password"
                        disabled={loading}
                        placeholder={t.confirmPasswordPlaceholder}
                        aria-invalid={confirm.length > 0 && confirm !== password ? true : undefined}
                        className={`${shell.input} ${styles.passwordInput} ${
                          confirm.length > 0 && confirm !== password ? styles.inputError : ''
                        }`}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? t.hidePassword : t.showPassword}
                        aria-pressed={showConfirm}
                      >
                        <EyeIcon off={showConfirm} />
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <ul className={styles.rules}>
                    {ruleState.map(({ id, met }) => (
                      <li key={id} className={`${styles.rule} ${met ? styles.ruleMet : ''}`}>
                        <CheckCircleIcon className={styles.ruleIcon} />
                        <span>{ruleLabels[id]}</span>
                      </li>
                    ))}
                  </ul>

                  <button type="submit" className={shell.signInBtn} disabled={loading}>
                    {loading ? (
                      <span className={shell.btnLoading}>
                        <span className={shell.spinner} />
                        {t.submitting}
                      </span>
                    ) : (
                      t.submit
                    )}
                  </button>

                  <Link href={LOGIN_URL} className={styles.backLink}>
                    {t.backToLogin}
                  </Link>
                </form>

                <div className={styles.expiryNote}>
                  <LockIcon className={styles.expiryIcon} />
                  <span>{t.expiryNote}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
