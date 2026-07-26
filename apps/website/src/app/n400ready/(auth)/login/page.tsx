'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { LangToggle } from './LangToggle';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import styles from './login.module.css';

/* ─── SVG Icons ─── */
function GoogleIcon() {
  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.21 7.21 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#000" d="M16.36 12.76c-.02-2.24 1.83-3.31 1.91-3.37-1.04-1.52-2.66-1.73-3.24-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.92-.77-1.5.02-2.89.87-3.66 2.21-1.56 2.71-.4 6.72 1.12 8.92.74 1.08 1.63 2.29 2.79 2.24 1.12-.04 1.54-.72 2.89-.72s1.73.72 2.91.7c1.2-.02 1.96-1.1 2.7-2.18.85-1.25 1.2-2.46 1.22-2.53-.03-.01-2.34-.9-2.36-3.56zM14.13 5.8c.62-.75 1.04-1.79.92-2.83-.89.04-1.97.6-2.61 1.34-.57.66-1.07 1.72-.94 2.73 1 .08 2.01-.5 2.63-1.24z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="#16A394" strokeWidth="2" />
      <path d="M2 7l10 6 10-6" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldCheckIcon({ width = 16, height = 16, className }: { width?: number | string; height?: number | string; className?: string }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#16A394" opacity="0.15" />
      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="#16A394" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FBBF24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ─── Provider button data ─── */
type OAuthId = 'google' | 'apple' | 'facebook';
const PROVIDERS: { id: OAuthId; name: string; Icon: () => React.ReactElement }[] = [
  { id: 'google', name: 'Google', Icon: GoogleIcon },
  { id: 'apple', name: 'Apple', Icon: AppleIcon },
  { id: 'facebook', name: 'Facebook', Icon: FacebookIcon },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function N400LoginPage() {
  // useSearchParams needs a Suspense boundary to keep this route prerenderable.
  return (
    <Suspense fallback={null}>
      <N400LoginScreen />
    </Suspense>
  );
}

function N400LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithOAuth } = useAuth();
  const { lang, dict } = useN400Lang();
  const t = dict.login;

  // ?reset=success is set by the reset-password page after a successful update.
  const resetDone = useSearchParams().get('reset') === 'success';

  const [loadingProvider, setLoadingProvider] = useState<OAuthId | 'email' | null>(null);
  // Land straight on the email form when the user has just reset their password.
  const [showEmailForm, setShowEmailForm] = useState(resetDone);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  async function handleOAuth(provider: OAuthId) {
    setError(null);
    setLoadingProvider(provider);
    const { error: err } = await signInWithOAuth(provider);
    if (err) {
      setError(err);
      setLoadingProvider(null);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingProvider('email');

    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoadingProvider(null);
      return;
    }

    // Fetch role to determine redirect
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      setError(t.loginFailed);
      setLoadingProvider(null);
      return;
    }

    window.location.href = '/n400ready';
  }

  return (
    <div className={styles.page}>
      {/* ─── DESKTOP FULL-SCREEN BACKGROUND (spans both columns, behind the card) ─── */}
      <div className={styles.desktopBg} aria-hidden="true" />

      {/* ─── MOBILE HERO ─── */}
      <div className={styles.mobileHero}>
        <div className={styles.mobileHeroBg}>
          <Image
            src="/images/n400/login thumbnail/mobile-login-background.png"
            alt="Statue of Liberty"
            fill
            className={styles.mobileHeroBgImg}
            priority
          />
        </div>
        <div className={styles.mobileHeroContent}>
          <div className={styles.brand}>
            <Image
              src="/images/logo-official.png"
              alt="Manna One Solution"
              width={32}
              height={32}
              className={styles.logo}
            />
            <div className={styles.brandText}>
              <span className={styles.brandName}>
                N400 <span className={styles.brandAccent}>Ready</span>
              </span>
              <span className={styles.brandTagline}>{t.tagline}</span>
            </div>
          </div>

          <div className={styles.mobileHeadline}>
            <h1>
              {t.headline1}<br />
              <strong>{t.headline2}</strong><br />
              <strong>{t.headline3}</strong>
            </h1>
          </div>
          <p className={styles.mobileHeroSub}>
            {t.mobileHeroSub}
          </p>
        </div>
      </div>

      {/* ─── CENTERED DESKTOP CONTAINER (max 1440px) ─── */}
      <div className={styles.desktopMain}>
      {/* ─── DESKTOP LEFT PANEL ─── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          {/* Logo & Brand */}
          <div className={styles.brand}>
            <Image
              src="/images/logo-official.png"
              alt="Manna One Solution"
              width={40}
              height={40}
              className={styles.logo}
            />
            <div className={styles.brandText}>
              <span className={styles.brandName}>
                N400 <span className={styles.brandAccent}>Ready</span>
              </span>
              <span className={styles.brandTagline}>{t.tagline}</span>
            </div>
          </div>

          <div className={styles.heroTextGroup}>
            {/* Hero Headline */}
            <div className={styles.heroHeadline}>
              <h1>
                {t.headline1}<br />
                <strong>{t.headline2}</strong><br />
                <strong>{t.headline3}</strong>
              </h1>
            </div>

            <p className={styles.heroSub}>
              {t.heroSub}
            </p>

            <div className={styles.socialProof}>
              <div className={styles.socialProofIconWrapper}>
                <ShieldCheckIcon width="24" height="24" className={styles.socialProofShield} />
              </div>
              <div className={styles.socialProofContent}>
                <div className={styles.stars}>
                  <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                </div>
                <p className={styles.socialProofText}>
                  {t.socialProof}
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ─── RIGHT PANEL / LOGIN CARD ─── */}
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <LangToggle />

          {/* Card header */}
          <div className={styles.cardHeader}>
            <Image
              src="/images/logo-official.png"
              alt="Manna One Solution"
              width={48}
              height={48}
              className={styles.cardLogo}
            />
          </div>

          <h2 className={styles.cardTitle}>
            {t.welcomePrefix} <span className={styles.brandAccent}>N400 Ready</span>
          </h2>
          <p className={styles.cardSubtitle}>
            {t.cardSubtitle}
          </p>

          {/* Password just reset */}
          {resetDone && (
            <div className={styles.successBox} role="status">{t.resetSuccess}</div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorBox}>{error}</div>
          )}

          {/* OAuth Buttons */}
          <div className={styles.oauthButtons}>
            {PROVIDERS.map(({ id, name, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleOAuth(id)}
                disabled={loadingProvider !== null}
                className={styles.oauthBtn}
              >
                {loadingProvider === id ? (
                  <span className={styles.spinner} />
                ) : (
                  <Icon />
                )}
                <span>{t.continueWith} {name}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>{t.or}</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Email button / form */}
          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className={styles.emailBtn}
            >
              <EmailIcon />
              <span>{t.continueWithEmail}</span>
              <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className={styles.emailForm}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.emailPlaceholder}
                className={styles.input}
                autoFocus
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t.passwordPlaceholder}
                className={styles.input}
              />
              <button
                type="submit"
                disabled={loadingProvider !== null}
                className={styles.signInBtn}
              >
                {loadingProvider === 'email' ? (
                  <span className={styles.btnLoading}>
                    <span className={styles.spinner} />
                    {t.signingIn}
                  </span>
                ) : (
                  t.signIn
                )}
              </button>

              <div className={styles.formLinks}>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className={styles.linkBtn}
                >
                  {t.forgotPassword}
                </button>
                <Link href={`/${lang}/signup`} className={styles.linkBold}>
                  {t.createAccount}
                </Link>
              </div>
            </form>
          )}



          {/* Security note */}
          <div className={styles.securityNote}>
            <ShieldCheckIcon />
            <span>
              {t.securityNote1}<br />
              {t.securityNote2}
            </span>
          </div>
        </div>
      </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
