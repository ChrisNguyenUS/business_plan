'use client';

/**
 * Header — Consistent page header across all N400 pages.
 *
 * Primary pages (lateral navigation):   Title + Streak + Avatar
 * Secondary pages (hierarchical):       Back + Title + Streak + Avatar
 *
 * No hamburger. No bookmark shortcut. No date range button.
 * The sidebar (desktop) and bottom nav (mobile) handle primary navigation.
 * The AvatarMenu handles secondary navigation.
 */

import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, Flame, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useN400UserState } from '@/lib/n400/user-state';
import { useAuth } from '@/components/providers/AuthProvider';
import { getShortName } from '@/lib/profile-utils';
import { AvatarMenu } from './AvatarMenu';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';
import type { N400Dict } from '@/lib/n400/i18n/vi';

function buildTitles(dict: N400Dict): Record<string, { title: string; subtitle?: string }> {
  return {
    '': { title: dict.header.dashboardTitle, subtitle: dict.header.dashboardGreeting },
    practice: {
      title: dict.header.practiceCivicsTitle,
      subtitle: dict.header.practiceSubtitle,
    },
    'mock-test': {
      title: dict.header.mockTestTitle,
      subtitle: dict.header.mockTestSubtitle,
    },
    flashcards: {
      title: 'Flashcards',
      subtitle: dict.header.flashcardsSubtitle,
    },
    statistic: {
      title: dict.header.statisticTitle,
      subtitle: dict.header.statisticSubtitle,
    },
    profile: { title: dict.header.profileTitle },
    categories: {
      title: dict.header.categoriesTitle,
      subtitle: dict.header.categoriesSubtitle,
    },
    study: { title: dict.header.studyTitle, subtitle: dict.header.studySubtitle },
    'study/civics': { title: dict.header.studyTitle },
    speaking: { title: 'Speaking' },
    'speaking/what-mean': { title: dict.header.speakingWhatMeanTitle },
    'speaking/yes-no': { title: dict.header.speakingYesNoTitle },
    writing: { title: dict.header.writingTitle },
    progress: { title: dict.header.progressTitle, subtitle: dict.header.progressSubtitle },
  };
}

/** Primary sections use lateral navigation (no Back button). */
const PRIMARY_SECTIONS = ['', 'study', 'mock-test', 'statistic', 'progress'];

/**
 * Mock-test sub-routes get their own exam-serious header: "Mock Test – <mode>"
 * with a group icon + subtitle, and a Back chevron to the Mock Test hub. The
 * hub itself (bare /mock-test) keeps the primary title from buildTitles.
 */
function buildMockSubroutes(dict: N400Dict): Record<string, { title: string; subtitle: string }> {
  return {
    full: {
      title: 'Mock Test – Full Interview',
      subtitle: dict.header.mockFullSubtitle,
    },
    civics: {
      title: 'Mock Test – Civics',
      subtitle: dict.header.mockCivicsSubtitle,
    },
    speaking: {
      title: 'Mock Test – Speaking',
      subtitle: dict.header.mockSpeakingSubtitle,
    },
    viet: {
      title: 'Mock Test – Writing',
      subtitle: dict.header.mockWritingSubtitle,
    },
  };
}

/**
 * Deterministic back navigation — navigate to logical parent, not browser history.
 * This creates predictable navigation regardless of how the user originally arrived.
 */
const PARENT_MAP: Record<string, string> = {
  profile: '',
  categories: '',
  help: '',
  setup: '',
  practice: 'study/civics',
  flashcards: 'study/civics',
  'study/civics': 'study',
  speaking: 'study',
  'speaking/what-mean': 'study',
  'speaking/yes-no': 'study',
  writing: 'study',
};

function detectSection(pathname: string | null): string {
  if (!pathname) return '';
  const base = '/n400ready';
  if (pathname === base || pathname === `${base}/`) return '';
  const rest = pathname.slice(base.length + 1);
  const segments = rest.split('/');
  if (segments[0] === 'speaking' && segments.length > 1) {
    if (segments[1] === 'what-mean' || segments[1] === 'yes-no') {
      return `speaking/${segments[1]}`;
    }
  }
  // The Civic detail page (/study/civics) is a secondary hub — it gets its own
  // section so it shows a Back button to the /study launcher, while the bare
  // /study launcher itself stays a primary (no-Back) section.
  if (segments[0] === 'study' && segments[1] === 'civics') {
    return 'study/civics';
  }
  return segments[0] ?? '';
}

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = '/n400ready';
  const section = detectSection(pathname);
  const { dict } = useN400Lang();
  const titles = buildTitles(dict);
  const mockSubroutes = buildMockSubroutes(dict);
  // Second path segment under /mock-test/<sub> selects the exam-specific header.
  const mockSub =
    section === 'mock-test' && pathname
      ? pathname.slice(base.length + 1).split('/')[1] ?? ''
      : '';
  const mockMeta = mockSubroutes[mockSub];
  const isSecondary = mockMeta ? true : !PRIMARY_SECTIONS.includes(section);

  // Dashboard greets by name and time of day (per the dashboard redesign
  // mock); every other page keeps its static title. Falls back to the static
  // entry while the profile is still loading.
  const { profile } = useAuth();
  let meta: { title: string; subtitle?: string } = mockMeta ?? titles[section] ?? titles[''];

  const isPracticeMode = searchParams?.get('mode') === 'practice';
  if (['speaking/what-mean', 'speaking/yes-no', 'writing'].includes(section) && !isPracticeMode) {
    meta = { title: dict.header.studyTitle };
  }

  if (section === '' && profile) {
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? dict.header.greetingMorning : hour < 18 ? dict.header.greetingAfternoon : dict.header.greetingEvening;
    meta = {
      title: tFormat(dict.header.dashboardGreetingName, { greeting, name: getShortName(profile) }),
      subtitle: dict.header.dashboardReadySubtitle,
    };
  }

  // Deterministic back navigation. Mock sub-routes always return to the Mock Test
  const parentHref = PARENT_MAP[section];
  const backHref = mockMeta
    ? `${base}/mock-test`
    : parentHref !== undefined
      ? parentHref
        ? `${base}/${parentHref}`
        : base
      : base;

  const { state, hydrated } = useN400UserState();
  const streak = hydrated ? state.streak.current : 0;
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const activeToday = hydrated && state.streak.lastActivityDate === today && streak > 0;
  // The flame lights up whenever there's a live streak — not only on the days
  // the user has already studied. A streak that isn't "kept today yet" should
  // still read as ON FIRE, nudging the user to keep it going.
  const hasStreak = hydrated && streak > 0;

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-gray-200/50 bg-slate-50/90 px-4 py-3 backdrop-blur-md lg:min-h-20 lg:px-8 lg:py-0">
      {/* Left: Back + Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isSecondary && (
          <Link
            href={backHref}
            aria-label={dict.header.backButton}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
        )}
        {/* Mobile dashboard shows the brand instead of the page title (per
            the mobile mock); the greeting moved into the dashboard content. */}
        {section === '' && (
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="relative h-9 w-9 shrink-0">
              <Image src="/images/logo-transparent.png" alt="N400 Ready" fill className="object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold leading-tight text-gray-800">N400 Ready</h2>
              <p className="text-[11px] leading-tight text-gray-500">{dict.header.mobileBrandTagline}</p>
            </div>
          </div>
        )}
        <div className={`min-w-0 ${section === '' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold leading-tight text-gray-800 lg:text-xl">{meta.title}</h2>
            {mockMeta ? <Users size={18} className="shrink-0 text-gray-400" aria-hidden /> : null}
          </div>
          {(!isSecondary || mockMeta) && meta.subtitle ? (
            <p className="mt-0.5 hidden text-sm text-gray-500 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>
      </div>

      {/* Right: Streak + Avatar */}
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        {/* Study streak badge */}
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition-colors lg:px-4 ${
            hasStreak
              ? 'bg-orange-50 border-orange-100'
              : 'bg-white border-gray-100'
          }`}
          title={
            activeToday
              ? dict.header.streakTooltipActive
              : streak > 0
                ? dict.header.streakTooltipInactive
                : dict.header.streakTooltipNoStreak
          }
        >
          <Flame
            className={hasStreak ? 'text-orange-500' : 'text-gray-300'}
            size={18}
          />
          <div className="flex min-w-0 flex-col">
            <span className="hidden text-[10px] font-medium leading-none text-gray-400 sm:block">
              {dict.header.streakLabel}
            </span>
            <span
              className={`text-sm font-bold leading-tight whitespace-nowrap ${
                hasStreak ? 'text-orange-700' : 'text-gray-800'
              }`}
            >
              {tFormat(streak === 1 ? dict.header.streakDay : dict.header.streakDays, { streak })}
            </span>
          </div>
        </div>

        {/* Avatar menu */}
        <AvatarMenu />
      </div>
    </header>
  );
}
