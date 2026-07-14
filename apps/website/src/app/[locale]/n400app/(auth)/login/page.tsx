'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
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

function StatueIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#DFF7F3" />
      <g transform="translate(12, 4) scale(0.5)">
        <path d="M24 6l-2 4-2-4-3 2 1 5h8l1-5-3-2z" fill="#16A394" opacity="0.7" />
        <path d="M22 15c-2 0-4 2-4 5v3h12v-3c0-3-2-5-4-5h-4z" fill="#16A394" opacity="0.5" />
        <path d="M18 23v20l-3 3h18l-3-3V23H18z" fill="#16A394" opacity="0.6" />
        <path d="M24 8v-4" stroke="#16A394" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 9l-4-6" stroke="#16A394" strokeWidth="1" strokeLinecap="round" />
        <path d="M28 9l4-6" stroke="#16A394" strokeWidth="1" strokeLinecap="round" />
        <circle cx="24" cy="12" r="5" fill="#16A394" opacity="0.4" />
        <rect x="21" y="38" width="6" height="8" rx="1" fill="#16A394" opacity="0.5" />
      </g>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
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

/* ─── Feature icons (desktop left panel) ─── */
function FeatureIcon({ children }: { children: React.ReactNode }) {
  return <div className={styles.featureIcon}>{children}</div>;
}

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A394" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ─── Feature data ─── */
const FEATURES = [
  {
    icon: <BookIcon />,
    title: 'Học tập cá nhân hóa',
    desc: 'Nội dung bám sát N-400, gợi ý thông minh theo tiến độ của bạn.',
  },
  {
    icon: <TargetIcon />,
    title: 'Luyện tập hiệu quả',
    desc: 'Học theo từng chủ đề, luyện câu hỏi, từ vựng, Yes/No và Writing.',
  },
  {
    icon: <ChartIcon />,
    title: 'Theo dõi tiến độ',
    desc: 'Thống kê chi tiết, giúp bạn cải thiện mỗi ngày.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Sẵn sàng cho buổi phỏng vấn',
    desc: 'Tự tin trả lời, chinh phục giấc mơ trở thành công dân Mỹ.',
  },
];

/* ─── Provider button data ─── */
type OAuthId = 'google' | 'apple' | 'facebook';
const PROVIDERS: { id: OAuthId; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'google', label: 'Tiếp tục với Google', Icon: GoogleIcon },
  { id: 'apple', label: 'Tiếp tục với Apple', Icon: AppleIcon },
  { id: 'facebook', label: 'Tiếp tục với Facebook', Icon: FacebookIcon },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function N400LoginPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'vi';
  const { signIn, signInWithOAuth } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<OAuthId | 'email' | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
      setLoadingProvider(null);
      return;
    }

    window.location.href = `/${locale}/n400app`;
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
              <span className={styles.brandTagline}>TỰ TIN CHINH PHỤC{'\n'}GIẤC MƠ MỸ!</span>
            </div>
          </div>

          <div className={styles.mobileHeadline}>
            <h1>
              Học thông minh.<br />
              <strong>Đậu phỏng vấn.</strong><br />
              <strong>Trở thành công dân Mỹ.</strong>
            </h1>
          </div>
          <p className={styles.mobileHeroSub}>
            Ứng dụng giúp bạn học và luyện thi<br />
            quốc tịch Mỹ (N-400) hiệu quả,<br />
            dễ dàng và thú vị.
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
              <span className={styles.brandTagline}>TỰ TIN CHINH PHỤC{'\n'}GIẤC MƠ MỸ!</span>
            </div>
          </div>

          <div className={styles.heroTextGroup}>
            {/* Hero Headline */}
            <div className={styles.heroHeadline}>
              <h1>
                Học thông minh.<br />
                <strong>Đậu phỏng vấn.</strong><br />
                <strong>Trở thành công dân Mỹ.</strong>
              </h1>
            </div>

            <p className={styles.heroSub}>
              N400 Ready là ứng dụng giúp bạn học và luyện thi quốc tịch Mỹ (N-400)<br />
              một cách hiệu quả, dễ dàng và thú vị.
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
                  Được xây dựng từ trải nghiệm phỏng vấn quốc tịch Mỹ thực tế và hướng dẫn chính thức mới nhất của USCIS.
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ─── RIGHT PANEL / LOGIN CARD ─── */}
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
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
            Welcome to <span className={styles.brandAccent}>N400 Ready</span>
          </h2>
          <p className={styles.cardSubtitle}>
            Tiếp tục hành trình chinh phục quốc tịch Mỹ 👋
          </p>

          {/* Error */}
          {error && (
            <div className={styles.errorBox}>{error}</div>
          )}

          {/* OAuth Buttons */}
          <div className={styles.oauthButtons}>
            {PROVIDERS.map(({ id, label, Icon }) => (
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
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>HOẶC</span>
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
              <span>Tiếp tục với Email</span>
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
                placeholder="Email"
                className={styles.input}
                autoFocus
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mật khẩu"
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
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </button>

              <div className={styles.formLinks}>
                <Link href={`/${locale}/forgot-password`} className={styles.link}>
                  Quên mật khẩu?
                </Link>
                <Link href={`/${locale}/signup`} className={styles.linkBold}>
                  Tạo tài khoản
                </Link>
              </div>
            </form>
          )}



          {/* Security note */}
          <div className={styles.securityNote}>
            <ShieldCheckIcon />
            <span>
              Dữ liệu của bạn được bảo mật tuyệt đối.<br />
              Chúng tôi không chia sẻ thông tin của bạn.
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
