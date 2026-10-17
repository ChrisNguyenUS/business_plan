# N400 Ready Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give N400 Ready crawlable, server-rendered public pages on mannaos.com (a landing page plus 56 state/territory answer pages, each in Vietnamese and English) that send readers to sign up. Also fix the app's D.C./territory answers to match USCIS.

**Architecture:** The public pages live in the `[locale]` marketing tree (`/vi/n400ready`, `/en/n400ready/states/texas`), not in the cookie-language app tree (`/n400ready`). They read only the static data files learners already use (`state-data.ts`, `reps-data.ts`, `questions-data.ts`), through pure builders in `src/lib/n400/public/`; React components only render. Middleware sends anonymous visitors on the exact `/n400ready` root to the landing page. A small `location-rules.ts` module carries the USCIS rules for D.C. and the territories, and both the app and the public pages use it.

**Tech Stack:** Next.js App Router (Server Components, `generateStaticParams`, `generateMetadata`), TypeScript, Tailwind, vitest (node environment), pnpm monorepo (`apps/website`).

**Spec:** `docs/superpowers/specs/2026-10-16-n400ready-public-pages-design.md` (approved 2026-10-16, all six owner decisions answered in §14). Read it before starting.

## Global Constraints

- App: `apps/website/` only. No database migration. Run every command from `apps/website/`.
- **Not a law firm:** every public page shows the disclosure "Manna One Solution không phải hãng luật và không tư vấn pháp lý. N400 Ready không liên kết với USCIS…" (exact strings in Task 4).
- **No expertise claims:** the strings "chuyên gia", "expert", "chuyên môn di trú" never appear in public copy (Task 4 test enforces it).
- **Never name the EB-3 white-label partner** anywhere: copy, metadata, JSON-LD, comments.
- **"Miễn phí" / "free" is allowed.** No pass guarantees, no `aggregateRating`.
- **Facts dated and sourced:** officials' names show "Kiểm tra ngày {N400_OFFICIALS_CHECKED_ON}" plus links to uscis.gov/citizenship/testupdates, senate.gov and house.gov.
- **One `<h1>` per page.**
- **Both languages for every page** (owner, 2026-10-16). hreflang en/vi, `x-default` = en (`localeAlternates`).
- **No PDF** (owner, 2026-10-16).
- **The N400 in-app UI rules do not apply** to these marketing pages. Never import in-app N400 components (`src/components/n400/*`) into them.
- Canonical/hreflang/sitemap URLs use `SITE_URL` = `https://www.mannaos.com` (never the apex).
- Commits: one logical change per commit, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Outward steps (push to `main`/deploy, edits to live blog posts in the prod DB) happen only after the owner says yes at that moment.
- Gates before each push: `pnpm vitest run`, `pnpm tsc --noEmit`, `pnpm eslint` all at 0 failures.

## Review Focus

1. **D.C./territory learners in voice mode:** "D.C. has no senators" / "Washington D.C. does not have a governor" is graded correct. "Muriel Bowser" for D.C. Q61 is graded wrong. Guam Q62 "Hagatna" (no diacritics) is graded correct. Tests in Task 10.
2. **Language choice on the anonymous redirect:** a visitor with cookie `n400_lang=en` and a Vietnamese browser lands on `/en/n400ready` (the cookie wins). `/n400ready/` with a trailing slash behaves like `/n400ready`. An anonymous deep link (`/n400ready/practice`) still goes to login, not the landing page. Tests in Task 2.
3. **Open redirect via the sign-up `next`:** `?next=//evil.com`, `?next=https://evil.com`, `?next=/\evil.com` are ignored (user goes to the default). Tests in Task 3.
4. **Edge rows on state pages:** none of the 56 pages renders `null`, `undefined` or an empty answer. D.C. shows the three USCIS rule sentences; territories show the delegate plus their capital. Every meta description is ≤ 160 characters. Tests in Tasks 11 and 12.
5. **Signed-in users are unaffected:** a signed-in user at `/n400ready` still reaches the dashboard/onboarding gate. The anonymous redirect only runs inside the `!user` branch. Asserted by a test on the decision function (Task 2) and by the manual curl check in Task 8.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/n400/public/state-slugs.ts` (+test) | state code ↔ URL slug | 1 |
| `src/lib/n400/public/anon-redirect.ts` (+test) | middleware decisions: anonymous root → landing; `?lang=` on login → cookie | 2 |
| `src/middleware.ts` | calls the two decisions | 2 |
| `src/lib/auth/safe-next.ts` (+test) | same-origin `next` check | 3 |
| `src/app/[locale]/(auth)/signup/page.tsx` | honor `?next=` after email sign-up | 3 |
| `src/app/n400ready/(auth)/login/page.tsx` | "Create account" link carries `next=/n400ready` | 3 |
| `src/lib/n400/public/copy.ts` (+test) | all vi/en strings for the public pages | 4 |
| `src/lib/n400/public/seo.ts` (+test) | metadata + JSON-LD builders, `electionNoticeActive` | 4, 12 |
| `src/components/n400-public/{CtaBlock,FaqList,Disclosure,ModuleList,AppScreenshots}.tsx` | render-only landing pieces | 5, 6 |
| `src/app/[locale]/n400ready/page.tsx` | landing route | 5 |
| `src/app/n400ready/(auth)/layout.tsx` | login noindex | 7 |
| `src/app/sitemap.ts`, `src/lib/seo/llms-txt.ts`, Footer, HeroSection, immigration page | discovery links | 7, 12 |
| `src/lib/n400/location-rules.ts` (+test) | USCIS D.C./territory rule answers | 9 |
| `src/lib/n400/state-data.ts` | territory capitals, `N400_OFFICIALS_CHECKED_ON` | 9 |
| `src/lib/n400/quiz-engine.ts`, `personalization.ts` | use the rules (answers, audio, summary) | 9 |
| `src/lib/n400/oral/get-oral-config.ts` | voice grading for rule answers | 10 |
| `scripts/n400/verify-officials.mjs` | compare senators/reps with senate.gov and clerk.house.gov | 9 |
| `src/lib/n400/public/state-page.ts` (+test) | `buildStatePage(code, locale)` | 11 |
| `src/components/n400-public/{StateGrid,AnswerCard,DistrictTable}.tsx` | render-only state pieces | 12 |
| `src/app/[locale]/n400ready/states/[state]/page.tsx`, `states/page.tsx` | state routes | 12 |

**Slices:** S1 = Tasks 1–8 (landing + redirect), pushed on its own. S2 = Tasks 9–14 (data fix + state pages + blog links).

---

## Slice S1 — Landing page + anonymous redirect

### Task 0: Setup check

- [ ] **Step 1:** From `apps/website/`, run `pnpm vitest run src/lib/n400/personalization.test.ts`. Expected: `9 passed`. If a package is missing, run `pnpm install` at the repo root and retry.
- [ ] **Step 2:** Read the spec, then the files this plan modifies: `src/middleware.ts`, `src/lib/seo/alternates.ts`, `src/lib/seo/json-ld.ts`, `src/app/[locale]/blog/[slug]/page.tsx` (the page pattern to copy).

### Task 1: State slugs

**Files:**
- Create: `src/lib/n400/public/state-slugs.ts`
- Test: `src/lib/n400/public/state-slugs.test.ts`

**Interfaces:**
- Consumes: `STATES`, `STATES_BY_CODE`, `StateCode` from `src/lib/n400/state-data.ts`.
- Produces: `stateSlug(code: StateCode): string`, `stateFromSlug(slug: string): StateCode | null`, `ALL_STATE_SLUGS: readonly string[]` (in `STATES` order: 50 states A–Z, then AS, DC, GU, MP, PR, VI).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/n400/public/state-slugs.test.ts
import { describe, expect, it } from 'vitest';
import { STATES } from '../state-data';
import { ALL_STATE_SLUGS, stateFromSlug, stateSlug } from './state-slugs';

describe('state slugs', () => {
  it('has one unique, URL-safe slug per state and territory', () => {
    expect(ALL_STATE_SLUGS).toHaveLength(56);
    expect(new Set(ALL_STATE_SLUGS).size).toBe(56);
    for (const s of ALL_STATE_SLUGS) expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('builds slugs from the English name', () => {
    expect(stateSlug('TX')).toBe('texas');
    expect(stateSlug('NY')).toBe('new-york');
    expect(stateSlug('DC')).toBe('district-of-columbia');
    expect(stateSlug('MP')).toBe('northern-mariana-islands');
  });

  it('round-trips every code', () => {
    for (const s of STATES) expect(stateFromSlug(stateSlug(s.code))).toBe(s.code);
  });

  it('returns null for unknown or differently-cased slugs', () => {
    expect(stateFromSlug('atlantis')).toBeNull();
    expect(stateFromSlug('Texas')).toBeNull();
    expect(stateFromSlug('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it.** `pnpm vitest run src/lib/n400/public/state-slugs.test.ts`. Expected: FAIL (cannot resolve `./state-slugs`).

- [ ] **Step 3: Implement**

```ts
// src/lib/n400/public/state-slugs.ts
// URL slug for each state/territory on the public N400 Ready pages
// (/[locale]/n400ready/states/<slug>). One slug for both languages.
import { STATES, STATES_BY_CODE, type StateCode } from '../state-data';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function stateSlug(code: StateCode): string {
  return toSlug(STATES_BY_CODE[code].nameEn);
}

const CODE_BY_SLUG = new Map<string, StateCode>(STATES.map((s) => [toSlug(s.nameEn), s.code]));

export const ALL_STATE_SLUGS: readonly string[] = STATES.map((s) => toSlug(s.nameEn));

export function stateFromSlug(slug: string): StateCode | null {
  return CODE_BY_SLUG.get(slug) ?? null;
}
```

- [ ] **Step 4: Run it.** Expected: PASS (4 tests).
- [ ] **Step 5: Commit**

```bash
git add src/lib/n400/public/state-slugs.ts src/lib/n400/public/state-slugs.test.ts
git commit -m "feat(website): N400 public pages — state URL slugs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Anonymous `/n400ready` → landing; `?lang=` on the login page

**Files:**
- Create: `src/lib/n400/public/anon-redirect.ts`
- Test: `src/lib/n400/public/anon-redirect.test.ts`
- Modify: `src/middleware.ts` (the `isN400Public` early return and the `if (!user)` block)

**Interfaces:**
- Consumes: `isN400Lang`, `N400Lang`, `N400_LANG_COOKIE`, `N400_LANG_COOKIE_MAX_AGE` from `src/lib/n400/i18n/config.ts`.
- Produces:
  - `anonN400Destination(pathname: string, cookieLang: string | undefined, acceptLanguage: string): string`
  - `loginLangSwitch(pathname: string, search: URLSearchParams): { lang: N400Lang; search: string } | null`

  The CTA links in Task 4 are `/n400ready/login?lang=vi|en`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/n400/public/anon-redirect.test.ts
import { describe, expect, it } from 'vitest';
import { anonN400Destination, loginLangSwitch } from './anon-redirect';

describe('anonN400Destination', () => {
  it('sends the exact app root to the landing page in the cookie language', () => {
    expect(anonN400Destination('/n400ready', 'en', 'vi-VN,vi;q=0.9')).toBe('/en/n400ready');
    expect(anonN400Destination('/n400ready/', 'vi', 'en-US')).toBe('/vi/n400ready');
  });

  it('falls back to Accept-Language when there is no valid cookie', () => {
    expect(anonN400Destination('/n400ready', undefined, 'vi-VN,vi;q=0.9,en;q=0.8')).toBe('/vi/n400ready');
    expect(anonN400Destination('/n400ready', 'fr', 'en-US,en;q=0.9')).toBe('/en/n400ready');
    expect(anonN400Destination('/n400ready', undefined, '')).toBe('/en/n400ready');
  });

  it('keeps sending deep app paths to the login page', () => {
    expect(anonN400Destination('/n400ready/practice', 'vi', 'vi')).toBe('/n400ready/login');
    expect(anonN400Destination('/n400ready/mock-test/civics', undefined, '')).toBe('/n400ready/login');
    expect(anonN400Destination('/n400readyx', undefined, '')).toBe('/n400ready/login');
  });
});

describe('loginLangSwitch', () => {
  it('turns ?lang= on the login page into a cookie + clean URL', () => {
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams('lang=en'))).toEqual({ lang: 'en', search: '' });
    expect(loginLangSwitch('/n400ready/login/', new URLSearchParams('lang=vi&reset=success'))).toEqual({
      lang: 'vi',
      search: '?reset=success',
    });
  });

  it('ignores other pages and unknown languages', () => {
    expect(loginLangSwitch('/n400ready', new URLSearchParams('lang=en'))).toBeNull();
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams('lang=fr'))).toBeNull();
    expect(loginLangSwitch('/n400ready/login', new URLSearchParams(''))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it.** `pnpm vitest run src/lib/n400/public/anon-redirect.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/n400/public/anon-redirect.ts
// Pure middleware decisions for anonymous N400 Ready traffic (spec §6).
// Only the app root goes to the public landing page; every other app path
// still needs a session and goes to the login form.
import { isN400Lang, type N400Lang } from '../i18n/config';

const ROOT_RE = /^\/n400ready\/?$/;
const LOGIN_RE = /^\/n400ready\/login\/?$/;

export function anonN400Destination(pathname: string, cookieLang: string | undefined, acceptLanguage: string): string {
  if (!ROOT_RE.test(pathname)) return '/n400ready/login';
  const lang: N400Lang = isN400Lang(cookieLang) ? cookieLang : acceptLanguage.toLowerCase().includes('vi') ? 'vi' : 'en';
  return `/${lang}/n400ready`;
}

/** `/n400ready/login?lang=en` from a public page: store the language, drop the param. */
export function loginLangSwitch(pathname: string, search: URLSearchParams): { lang: N400Lang; search: string } | null {
  if (!LOGIN_RE.test(pathname)) return null;
  const lang = search.get('lang');
  if (!isN400Lang(lang)) return null;
  const rest = new URLSearchParams(search);
  rest.delete('lang');
  const q = rest.toString();
  return { lang, search: q ? `?${q}` : '' };
}
```

- [ ] **Step 4: Run it.** Expected: PASS (5 tests).

- [ ] **Step 5: Wire the middleware.** In `src/middleware.ts`:

  Add the import:
  ```ts
  import { anonN400Destination, loginLangSwitch } from '@/lib/n400/public/anon-redirect';
  ```

  Replace
  ```ts
  if (isN400Public) {
    return captureAttribution(request, NextResponse.next());
  }
  ```
  with
  ```ts
  if (isN400Public) {
    // Public pages link to /n400ready/login?lang=xx so the form opens in the
    // reader's language: store it in the app cookie and drop the param.
    const langSwitch = loginLangSwitch(pathname, request.nextUrl.searchParams);
    if (langSwitch) {
      const url = request.nextUrl.clone();
      url.search = langSwitch.search;
      const res = NextResponse.redirect(url);
      res.cookies.set(N400_LANG_COOKIE, langSwitch.lang, {
        path: '/',
        maxAge: N400_LANG_COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return res;
    }
    return captureAttribution(request, NextResponse.next());
  }
  ```

  Replace
  ```ts
    if (isN400Path) {
      return NextResponse.redirect(new URL('/n400ready/login', request.url));
    }
  ```
  (inside `if (!user)`) with
  ```ts
    if (isN400Path) {
      // The app root shows anonymous visitors (and crawlers) the public
      // landing page; deeper app paths still need a session.
      const to = anonN400Destination(
        pathname,
        request.cookies.get(N400_LANG_COOKIE)?.value,
        request.headers.get('accept-language') ?? ''
      );
      return NextResponse.redirect(new URL(to, request.url));
    }
  ```

- [ ] **Step 6:** Run `pnpm tsc --noEmit` and `pnpm vitest run src/lib/n400/public`. Expected: 0 errors, all pass.
- [ ] **Step 7: Commit**

```bash
git add src/lib/n400/public/anon-redirect.ts src/lib/n400/public/anon-redirect.test.ts src/middleware.ts
git commit -m "feat(website): anonymous /n400ready goes to the public landing page; ?lang= on login

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Email sign-up from N400 Ready returns to N400 Ready

Today the N400 login page's "Tạo tài khoản" link goes to `/{lang}/signup`, and a successful email sign-up lands in `/{locale}/portal` (the client portal), not N400 Ready. The landing CTA would inherit this bug.

**Files:**
- Create: `src/lib/auth/safe-next.ts`
- Test: `src/lib/auth/safe-next.test.ts`
- Modify: `src/app/[locale]/(auth)/signup/page.tsx` (the `if (hasSession)` block, about line 53)
- Modify: `src/app/n400ready/(auth)/login/page.tsx` (the `<Link href={`/${lang}/signup`}` at about line 368)

**Interfaces:**
- Produces: `safeNextPath(raw: string | null): string | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/safe-next.test.ts
import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('accepts same-origin absolute paths', () => {
    expect(safeNextPath('/n400ready')).toBe('/n400ready');
    expect(safeNextPath('/vi/portal?x=1')).toBe('/vi/portal?x=1');
  });

  it('rejects anything that could leave the site', () => {
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('n400ready')).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it.** `pnpm vitest run src/lib/auth/safe-next.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
// src/lib/auth/safe-next.ts
/** A post-auth destination is honored only if it is a path on this site. */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Use it in sign-up.** In `src/app/[locale]/(auth)/signup/page.tsx`, add `import { safeNextPath } from "@/lib/auth/safe-next";` and replace

```tsx
    if (hasSession) {
      window.location.href = `/${locale}/portal`;
      return;
    }
```
with
```tsx
    if (hasSession) {
      // N400 Ready links here with ?next=/n400ready; read it at submit time
      // (not during render) so the page needs no Suspense boundary.
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      window.location.href = next ?? `/${locale}/portal`;
      return;
    }
```

- [ ] **Step 6: Link from the N400 login.** In `src/app/n400ready/(auth)/login/page.tsx`, change `href={`/${lang}/signup`}` to `href={`/${lang}/signup?next=%2Fn400ready`}`.
- [ ] **Step 7:** `pnpm tsc --noEmit && pnpm eslint src/lib/auth src/app/[locale]/(auth)/signup src/app/n400ready/(auth)/login`. Expected: 0 errors.
- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/safe-next.ts src/lib/auth/safe-next.test.ts "src/app/[locale]/(auth)/signup/page.tsx" "src/app/n400ready/(auth)/login/page.tsx"
git commit -m "fix(website): email sign-up from N400 Ready returns to N400 Ready, not the portal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Landing copy + SEO builders

**Files:**
- Create: `src/lib/n400/public/copy.ts`, `src/lib/n400/public/seo.ts`
- Test: `src/lib/n400/public/copy.test.ts`, `src/lib/n400/public/seo.test.ts`

**Interfaces:**
- Consumes: `Locale` (`src/lib/i18n/config.ts`), `localeAlternates` (`src/lib/seo/alternates.ts`), `ORGANIZATION_ID` (`src/lib/seo/json-ld.ts`), `SITE_URL`.
- Produces:
  - `PUBLIC_COPY: Record<Locale, PublicCopy>`, with types `PublicCopy`, `FaqItem = { q: string; a: string }`, `LinkItem = { label: string; href: string }`
  - `ctaHref(locale: Locale): string` → `/n400ready/login?lang=${locale}`
  - `landingMetadata(locale: Locale): Metadata`
  - `landingJsonLd(locale: Locale): Record<string, unknown>`
  - `breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown>` (paths start with `/`; made absolute with `SITE_URL`)

  Task 12 adds the state builders to the same files.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/n400/public/copy.test.ts
import { describe, expect, it } from 'vitest';
import { PUBLIC_COPY, ctaHref } from './copy';

const allText = (v: unknown): string => JSON.stringify(v).toLowerCase();

describe('public N400 copy', () => {
  it('never claims expertise or names the EB-3 partner', () => {
    for (const locale of ['vi', 'en'] as const) {
      const text = allText(PUBLIC_COPY[locale]);
      for (const banned of ['chuyên gia', 'expert', 'chuyên môn di trú', 'guarantee', 'đảm bảo đậu']) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it('carries the non-attorney and not-USCIS disclosure in both languages', () => {
    expect(PUBLIC_COPY.vi.disclosure).toContain('không phải hãng luật');
    expect(PUBLIC_COPY.vi.disclosure).toContain('không liên kết với USCIS');
    expect(PUBLIC_COPY.en.disclosure).toContain('not a law firm');
    expect(PUBLIC_COPY.en.disclosure).toContain('not affiliated with USCIS');
  });

  it('has the same structure in both languages', () => {
    expect(PUBLIC_COPY.en.landing.modules).toHaveLength(PUBLIC_COPY.vi.landing.modules.length);
    expect(PUBLIC_COPY.en.landing.faq).toHaveLength(PUBLIC_COPY.vi.landing.faq.length);
  });

  it('only describes modules the app really has (no reading module)', () => {
    expect(allText(PUBLIC_COPY.vi.landing.modules)).not.toContain('tập đọc');
    expect(allText(PUBLIC_COPY.en.landing.modules)).not.toContain('reading');
  });

  it('sends CTAs to the login page in the page language', () => {
    expect(ctaHref('vi')).toBe('/n400ready/login?lang=vi');
    expect(ctaHref('en')).toBe('/n400ready/login?lang=en');
  });
});
```

```ts
// src/lib/n400/public/seo.test.ts
import { describe, expect, it } from 'vitest';
import { PUBLIC_COPY } from './copy';
import { landingJsonLd, landingMetadata } from './seo';

describe('landing metadata', () => {
  it('has its own title, a description of at most 160 characters, canonical and hreflang', () => {
    for (const locale of ['vi', 'en'] as const) {
      const m = landingMetadata(locale);
      expect(m.title).toEqual({ absolute: PUBLIC_COPY[locale].landing.metaTitle });
      expect((m.description ?? '').length).toBeLessThanOrEqual(160);
      expect(m.alternates).toEqual({
        canonical: `/${locale}/n400ready`,
        languages: { en: '/en/n400ready', vi: '/vi/n400ready', 'x-default': '/en/n400ready' },
      });
    }
    expect(landingMetadata('vi').description).toContain('miễn phí');
  });
});

describe('landing JSON-LD', () => {
  const graph = (landingJsonLd('vi')['@graph'] as Record<string, unknown>[]);
  const byType = (t: string) => graph.find((n) => n['@type'] === t)!;

  it('describes a free web application published by the organization, with no rating', () => {
    const app = byType('WebApplication');
    expect(app.name).toBe('N400 Ready');
    expect(app.offers).toEqual({ '@type': 'Offer', price: 0, priceCurrency: 'USD' });
    expect(app.publisher).toEqual({ '@id': 'https://www.mannaos.com/#organization' });
    expect(app.url).toBe('https://www.mannaos.com/vi/n400ready');
    expect(JSON.stringify(graph)).not.toContain('aggregateRating');
  });

  it('marks up exactly the FAQ the page shows', () => {
    const faq = byType('FAQPage');
    const items = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(items.map((i) => i.name)).toEqual(PUBLIC_COPY.vi.landing.faq.map((f) => f.q));
    expect(items.map((i) => i.acceptedAnswer.text)).toEqual(PUBLIC_COPY.vi.landing.faq.map((f) => f.a));
  });

  it('has a two-step breadcrumb with absolute URLs', () => {
    const items = byType('BreadcrumbList').itemListElement as { position: number; item: string }[];
    expect(items.map((i) => i.item)).toEqual(['https://www.mannaos.com/vi', 'https://www.mannaos.com/vi/n400ready']);
  });
});
```

- [ ] **Step 2: Run them.** `pnpm vitest run src/lib/n400/public`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `copy.ts`.** The strings below are the approved wording; copy them exactly. Task 12 adds the `state` block.

```ts
// src/lib/n400/public/copy.ts
// Every string on the public N400 Ready pages (spec §7–§8). The app's own
// dictionaries (src/lib/n400/i18n/*) belong to the cookie-language app and
// are not reused here.
import type { Locale } from '@/lib/i18n/config';

export interface FaqItem { q: string; a: string }
export interface LinkItem { label: string; href: string }

export interface PublicCopy {
  home: string;
  disclosure: string;
  ctaPrimary: string;
  ctaSecondary: string;
  landing: {
    metaTitle: string;
    metaDescription: string;
    h1: string;
    lead: string;
    modulesTitle: string;
    modules: { title: string; body: string }[];
    screenshotsTitle: string;
    screenshots: { file: string; alt: string }[];
    personalTitle: string;
    personalBody: string;
    whichTestTitle: string;
    whichTestBody: string;
    whichTestLink: LinkItem;
    seniorBody: string;
    seniorLink: LinkItem;
    fullListTitle: string;
    fullListBody: string;
    fullListLink: LinkItem;
    faqTitle: string;
    faq: FaqItem[];
  };
}

const USCIS_TEST_PAGE = 'https://www.uscis.gov/citizenship/learn-about-citizenship/the-naturalization-interview-and-test';
const USCIS_128_PDF =
  'https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf';

export const PUBLIC_COPY: Record<Locale, PublicCopy> = {
  vi: {
    home: 'Trang chủ',
    disclosure:
      'Manna One Solution không phải hãng luật và không tư vấn pháp lý. N400 Ready không liên kết với USCIS hay chính phủ Mỹ. Danh sách câu hỏi chính thức trên uscis.gov là chuẩn.',
    ctaPrimary: 'Bắt đầu miễn phí',
    ctaSecondary: 'Đã có tài khoản? Đăng nhập',
    landing: {
      metaTitle: 'N400 Ready: luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt',
      metaDescription:
        'Luyện thi quốc tịch Mỹ miễn phí: 128 câu hỏi công dân bộ 2025, nói, viết và phỏng vấn thử, song ngữ Việt–Anh, trên điện thoại hoặc máy tính.',
      h1: 'N400 Ready — luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt',
      lead:
        'N400 Ready là ứng dụng miễn phí của Manna One Solution giúp bạn chuẩn bị cho buổi phỏng vấn quốc tịch Mỹ (đơn N-400). Bạn luyện 128 câu hỏi công dân của bài thi 2025, luyện nói, luyện viết và làm phỏng vấn thử, bằng tiếng Việt và tiếng Anh, trên điện thoại hoặc máy tính.',
      modulesTitle: 'Luyện những gì',
      modules: [
        { title: 'Câu hỏi công dân (Civics)', body: '128 câu hỏi của bài thi 2025, có dịch tiếng Việt, nghe phát âm, thẻ ghi nhớ và ôn lại câu sai.' },
        { title: 'Luyện nói', body: 'Các câu hỏi Yes/No trong đơn N-400 và các câu “What does … mean?” mà nhân viên thường hỏi.' },
        { title: 'Luyện viết', body: 'Nghe một câu tiếng Anh rồi viết lại, giống phần thi viết.' },
        { title: 'Trả lời bằng giọng nói', body: 'Nói câu trả lời và được chấm ngay, như khi trả lời nhân viên USCIS.' },
        { title: 'Thi thử', body: 'Thi thử Civics, Viết, Nói, hoặc cả buổi phỏng vấn đầy đủ.' },
      ],
      screenshotsTitle: 'Giao diện ứng dụng',
      screenshots: [
        { file: '/images/n400/public/vi-civics-practice.png', alt: 'Màn hình luyện câu hỏi công dân trong N400 Ready' },
        { file: '/images/n400/public/vi-state-answers.png', alt: 'Màn hình đáp án theo tiểu bang trong N400 Ready' },
      ],
      personalTitle: 'Đáp án theo nơi bạn sống',
      personalBody:
        'Bốn câu trong bộ 128 câu có đáp án khác nhau tùy nơi bạn sống: thượng nghị sĩ (câu 23), dân biểu Hạ viện (câu 29), thống đốc (câu 61) và thủ phủ tiểu bang (câu 62). Khi bạn nhập địa chỉ, N400 Ready tự điền đáp án cho tiểu bang và khu bầu cử của bạn.',
      whichTestTitle: 'Thi bài 2025 hay 2008? Trên 65 tuổi?',
      whichTestBody:
        'Người nộp đơn N-400 từ ngày 20/10/2025 thi bài 2025 với bộ 128 câu; người nộp trước ngày đó thi bài 2008.',
      whichTestLink: { label: 'Thi quốc tịch Mỹ: toàn bộ quy trình', href: '/vi/blog/thi-quoc-tich-my' },
      seniorBody:
        'Từ 65 tuổi và có thẻ xanh từ 20 năm trở lên? Bạn có thể được thi bằng tiếng Việt với bộ câu hỏi ngắn hơn.',
      seniorLink: { label: 'Thi quốc tịch Mỹ cho người trên 65 tuổi', href: '/vi/blog/thi-quoc-tich-my-cho-nguoi-tren-65-tuoi' },
      fullListTitle: 'Danh sách đầy đủ 128 câu',
      fullListBody: 'Xem đủ 128 câu hỏi kèm đáp án chính thức của USCIS và bản dịch tiếng Việt.',
      fullListLink: { label: '128 câu hỏi thi quốc tịch Mỹ bằng tiếng Việt', href: '/vi/blog/128-cau-hoi-thi-quoc-tich-my' },
      faqTitle: 'Câu hỏi thường gặp',
      faq: [
        { q: 'N400 Ready có thật sự miễn phí không?', a: 'Có. Bạn tạo tài khoản và dùng mọi phần luyện tập mà không phải trả tiền.' },
        {
          q: 'Tôi không giỏi tiếng Anh, có dùng được không?',
          a: 'Được. Mọi câu hỏi đều có bản dịch tiếng Việt và phát âm tiếng Anh để bạn nghe theo. Bạn có thể chuyển giao diện giữa tiếng Việt và tiếng Anh bất cứ lúc nào.',
        },
        { q: 'Dùng trên điện thoại được không?', a: 'Được. N400 Ready chạy trong trình duyệt của điện thoại và máy tính, không cần cài đặt.' },
        {
          q: 'Đáp án theo tiểu bang lấy từ đâu?',
          a: 'Từ danh sách thượng nghị sĩ, dân biểu và thống đốc đương nhiệm, có ghi ngày kiểm tra. Hãy trả lời theo người đang giữ chức vào ngày phỏng vấn; khi có khác biệt, trang uscis.gov/citizenship/testupdates là chuẩn.',
        },
        { q: 'N400 Ready có phải của USCIS không?', a: 'Không. N400 Ready do Manna One Solution làm ra và không liên kết với USCIS hay chính phủ Mỹ.' },
        {
          q: 'N400 Ready có tư vấn pháp lý không?',
          a: 'Không. Manna One Solution không phải hãng luật và không tư vấn pháp lý. Với câu hỏi về hồ sơ riêng của bạn, hãy hỏi luật sư di trú có giấy phép.',
        },
      ],
    },
  },
  en: {
    home: 'Home',
    disclosure:
      'Manna One Solution is not a law firm and does not give legal advice. N400 Ready is not affiliated with USCIS or the U.S. government. The official question list on uscis.gov is the standard.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'Have an account? Sign in',
    landing: {
      metaTitle: 'N400 Ready: free U.S. citizenship test practice (Vietnamese & English)',
      metaDescription:
        'Free U.S. citizenship test practice: the 128 questions of the 2025 civics test, speaking, writing and mock interviews, in English and Vietnamese.',
      h1: 'N400 Ready — free U.S. citizenship test practice in English and Vietnamese',
      lead:
        'N400 Ready is a free app from Manna One Solution that helps you prepare for your U.S. naturalization interview (Form N-400). Practice the 128 questions of the 2025 civics test, speaking, writing and full mock interviews, in English and Vietnamese, on your phone or computer.',
      modulesTitle: 'What you can practice',
      modules: [
        { title: 'Civics questions', body: 'All 128 questions of the 2025 test, with Vietnamese translations, audio, flashcards and review of missed questions.' },
        { title: 'Speaking', body: 'The N-400 yes/no questions and the “What does … mean?” questions officers often ask.' },
        { title: 'Writing', body: 'Listen to an English sentence and write it down, like the writing test.' },
        { title: 'Answer out loud', body: 'Say your answer and get graded right away, as you would with a USCIS officer.' },
        { title: 'Mock tests', body: 'Practice tests for civics, writing, speaking, or the full interview.' },
      ],
      screenshotsTitle: 'Inside the app',
      screenshots: [
        { file: '/images/n400/public/en-civics-practice.png', alt: 'Civics practice screen in N400 Ready' },
        { file: '/images/n400/public/en-state-answers.png', alt: 'State-specific answers screen in N400 Ready' },
      ],
      personalTitle: 'Answers for where you live',
      personalBody:
        'Four of the 128 questions depend on where you live: your U.S. senators (question 23), your representative (29), your governor (61) and your state capital (62). Enter your address and N400 Ready fills in the answers for your state and congressional district.',
      whichTestTitle: '2025 or 2008 test? Over 65?',
      whichTestBody:
        'Applicants who file Form N-400 on or after October 20, 2025 take the 2025 test with 128 questions; earlier filings take the 2008 test.',
      whichTestLink: { label: 'USCIS: the naturalization interview and test', href: USCIS_TEST_PAGE },
      seniorBody:
        'Age 65 or older with a green card for 20 years or more? You may be able to take the civics test in your own language with a shorter question set.',
      seniorLink: { label: 'USCIS: exceptions and accommodations', href: USCIS_TEST_PAGE },
      fullListTitle: 'The full list of 128 questions',
      fullListBody: 'Read all 128 questions with the official USCIS answers.',
      fullListLink: { label: 'USCIS 2025 civics test questions (PDF)', href: USCIS_128_PDF },
      faqTitle: 'Frequently asked questions',
      faq: [
        { q: 'Is N400 Ready really free?', a: 'Yes. You create an account and use every practice section without paying.' },
        {
          q: 'My English is not strong. Can I still use it?',
          a: 'Yes. Every question has a Vietnamese translation and English audio to listen to. You can switch the app between English and Vietnamese at any time.',
        },
        { q: 'Does it work on a phone?', a: 'Yes. N400 Ready runs in the browser on phones and computers, with nothing to install.' },
        {
          q: 'Where do the state answers come from?',
          a: 'From the lists of current senators, representatives and governors, with the date they were checked. Answer with whoever holds the office on your interview day; if anything differs, uscis.gov/citizenship/testupdates is the standard.',
        },
        { q: 'Is N400 Ready made by USCIS?', a: 'No. N400 Ready is made by Manna One Solution and is not affiliated with USCIS or the U.S. government.' },
        {
          q: 'Does N400 Ready give legal advice?',
          a: 'No. Manna One Solution is not a law firm and does not give legal advice. For questions about your own case, ask a licensed immigration attorney.',
        },
      ],
    },
  },
};

export function ctaHref(locale: Locale): string {
  return `/n400ready/login?lang=${locale}`;
}
```

- [ ] **Step 4: Implement `seo.ts` (landing part).**

```ts
// src/lib/n400/public/seo.ts
// Metadata + JSON-LD for the public N400 Ready pages. Structured data is
// built from the same copy arrays the pages render (spec §7–§8).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/seo/site';
import { PUBLIC_COPY, type FaqItem } from './copy';

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

export function faqJsonLd(faq: FaqItem[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function landingMetadata(locale: Locale): Metadata {
  const c = PUBLIC_COPY[locale].landing;
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: localeAlternates(locale, '/n400ready'),
    openGraph: { type: 'website', url: `/${locale}/n400ready`, title: c.metaTitle, description: c.metaDescription },
  };
}

export function landingJsonLd(locale: Locale): Record<string, unknown> {
  const c = PUBLIC_COPY[locale];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'N400 Ready',
        url: `${SITE_URL}/${locale}/n400ready`,
        description: c.landing.metaDescription,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: ['vi', 'en'],
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
        publisher: { '@id': ORGANIZATION_ID },
      },
      breadcrumbJsonLd([
        { name: c.home, path: `/${locale}` },
        { name: 'N400 Ready', path: `/${locale}/n400ready` },
      ]),
      faqJsonLd(c.landing.faq),
    ],
  };
}
```

- [ ] **Step 5: Run.** `pnpm vitest run src/lib/n400/public`. Expected: PASS. If a description is over 160 characters, shorten the copy (not the test) and tell the owner which sentence changed.
- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/public/copy.ts src/lib/n400/public/copy.test.ts src/lib/n400/public/seo.ts src/lib/n400/public/seo.test.ts
git commit -m "feat(website): N400 public pages — landing copy, metadata and JSON-LD

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Landing page route + components

**Files:**
- Create: `src/components/n400-public/CtaBlock.tsx`, `FaqList.tsx`, `Disclosure.tsx`, `ModuleList.tsx`
- Create: `src/app/[locale]/n400ready/page.tsx`
- Test: `src/app/[locale]/n400ready/page.test.tsx`

**Interfaces:**
- Consumes: `PUBLIC_COPY`, `ctaHref` (Task 4), `landingMetadata`, `landingJsonLd` (Task 4), `serializeJsonLd`, `isValidLocale`.
- Produces: `<CtaBlock locale />`, `<FaqList title items />`, `<Disclosure text />`, `<ModuleList title modules />` (reused in Task 12). The landing page has a section `id="personal"`; Task 12 inserts the state grid with `id="states"` after it.

- [ ] **Step 1: Write the failing render test**

```tsx
// src/app/[locale]/n400ready/page.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LandingPage from './page';

async function html(locale: string) {
  return renderToStaticMarkup(await LandingPage({ params: Promise.resolve({ locale }) }));
}

describe('/[locale]/n400ready', () => {
  it('server-renders the full Vietnamese landing text with one h1', async () => {
    const h = await html('vi');
    expect(h.match(/<h1/g)).toHaveLength(1);
    expect(h).toContain('luyện thi quốc tịch Mỹ miễn phí');
    expect(h).toContain('/n400ready/login?lang=vi');
    expect(h).toContain('/vi/blog/128-cau-hoi-thi-quoc-tich-my');
    expect(h).toContain('không phải hãng luật');
    expect(h).toContain('application/ld+json');
  });

  it('renders the English version', async () => {
    const h = await html('en');
    expect(h).toContain('free U.S. citizenship test practice');
    expect(h).toContain('/n400ready/login?lang=en');
    expect(h).toContain('not a law firm');
  });
});
```

- [ ] **Step 2: Run it.** `pnpm vitest run "src/app/[locale]/n400ready"`. Expected: FAIL (module missing). If the file fails to collect because `.tsx` JSX needs React in scope, add `import React from 'react';` at the top of the test (the vitest config has no JSX preset; the blog tests use `renderToStaticMarkup` the same way, so check `src/components/blog/*.test.tsx` and copy its header).

- [ ] **Step 3: Components** (plain server components; Tailwind classes copied from the blog post page for visual consistency)

```tsx
// src/components/n400-public/CtaBlock.tsx
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { PUBLIC_COPY, ctaHref } from '@/lib/n400/public/copy';

export function CtaBlock({ locale, title }: { locale: Locale; title?: string }) {
  const c = PUBLIC_COPY[locale];
  return (
    <div className="rounded-2xl bg-charcoal p-8 text-center">
      {title && <h2 className="text-xl font-bold text-white mb-6">{title}</h2>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={ctaHref(locale)} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark">
          {c.ctaPrimary}
        </Link>
        <Link href={ctaHref(locale)} className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
          {c.ctaSecondary}
        </Link>
      </div>
    </div>
  );
}
```

```tsx
// src/components/n400-public/FaqList.tsx
import type { FaqItem } from '@/lib/n400/public/copy';

export function FaqList({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((f) => (
          <details key={f.q} className="rounded-xl border border-border p-4">
            <summary className="font-semibold text-charcoal cursor-pointer">{f.q}</summary>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// src/components/n400-public/Disclosure.tsx
export function Disclosure({ text }: { text: string }) {
  return (
    <p className="mt-10 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">{text}</p>
  );
}
```

```tsx
// src/components/n400-public/ModuleList.tsx
export function ModuleList({ title, modules }: { title: string; modules: { title: string; body: string }[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-4">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.title} className="rounded-xl border border-border p-4">
            <h3 className="font-semibold text-charcoal">{m.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Page**

```tsx
// src/app/[locale]/n400ready/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/config';
import { PUBLIC_COPY } from '@/lib/n400/public/copy';
import { landingJsonLd, landingMetadata } from '@/lib/n400/public/seo';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { CtaBlock } from '@/components/n400-public/CtaBlock';
import { Disclosure } from '@/components/n400-public/Disclosure';
import { FaqList } from '@/components/n400-public/FaqList';
import { ModuleList } from '@/components/n400-public/ModuleList';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return isValidLocale(locale) ? landingMetadata(locale) : {};
}

export default async function N400ReadyLandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const c = PUBLIC_COPY[locale];
  const l = c.landing;
  const linkCls = 'text-primary font-semibold hover:underline';

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(landingJsonLd(locale)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{c.home}</Link>
          <span className="mx-2">›</span>
          <span>N400 Ready</span>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{l.h1}</h1>
        <p className="text-lg text-muted-foreground mb-8">{l.lead}</p>
        <CtaBlock locale={locale} />

        <ModuleList title={l.modulesTitle} modules={l.modules} />

        <section id="personal" className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.personalTitle}</h2>
          <p className="text-muted-foreground">{l.personalBody}</p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.whichTestTitle}</h2>
          <p className="text-muted-foreground">
            {l.whichTestBody} <Link href={l.whichTestLink.href} className={linkCls}>{l.whichTestLink.label}</Link>
          </p>
          <p className="mt-3 text-muted-foreground">
            {l.seniorBody} <Link href={l.seniorLink.href} className={linkCls}>{l.seniorLink.label}</Link>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{l.fullListTitle}</h2>
          <p className="text-muted-foreground">
            {l.fullListBody} <Link href={l.fullListLink.href} className={linkCls}>{l.fullListLink.label}</Link>
          </p>
        </section>

        <FaqList title={l.faqTitle} items={l.faq} />
        <div className="mt-12"><CtaBlock locale={locale} /></div>
        <Disclosure text={c.disclosure} />
      </article>
    </div>
  );
}
```

  Do not add `revalidate` or `dynamic` exports: the page inherits the locale layout's `revalidate = 30` and its `generateStaticParams` for locales.

- [ ] **Step 5: Run.** `pnpm vitest run "src/app/[locale]/n400ready"`. Expected: PASS.
- [ ] **Step 6:** `pnpm tsc --noEmit && pnpm eslint src/components/n400-public "src/app/[locale]/n400ready"`. Expected: 0.
- [ ] **Step 7: Commit**

```bash
git add src/components/n400-public "src/app/[locale]/n400ready/page.tsx" "src/app/[locale]/n400ready/page.test.tsx"
git commit -m "feat(website): N400 Ready public landing page (vi + en)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: App screenshots on the landing page (needs owner files)

The owner approved two real screenshots: Civics practice and state personalization. The landing page has one version per language, so four PNG files are needed.

**Files:**
- Add (from owner): `public/images/n400/public/vi-civics-practice.png`, `vi-state-answers.png`, `en-civics-practice.png`, `en-state-answers.png`. These are phone screenshots, portrait, about 390×844 CSS px (`@2x` is fine).
- Create: `src/components/n400-public/AppScreenshots.tsx`
- Modify: `src/app/[locale]/n400ready/page.tsx`, `page.test.tsx`

- [ ] **Step 1: Get the files.** Ask the owner (one message) for four screenshots taken on their phone while signed in: (1) a Civics practice question screen and (2) the address personalization summary ("Đáp án của bạn") screen, once with the app in Vietnamese and once in English. They should contain no personal data: use a test address or crop the address out. Save them under the names above. **Do not continue Task 6 until the files exist.** Task 7 onward does not depend on this task, so continue there and come back.
- [ ] **Step 2: Add the failing assertion** to the vi test in `page.test.tsx`:

```tsx
    expect(h).toContain('/images/n400/public/vi-civics-practice.png');
    expect(h).toContain('Màn hình đáp án theo tiểu bang trong N400 Ready');
```

  Run it. Expected: FAIL.

- [ ] **Step 3: Component**

```tsx
// src/components/n400-public/AppScreenshots.tsx
import Image from 'next/image';

export function AppScreenshots({ title, shots }: { title: string; shots: { file: string; alt: string }[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {shots.map((s) => (
          <Image key={s.file} src={s.file} alt={s.alt} width={390} height={844} className="w-full h-auto rounded-2xl border border-border" />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4:** In `page.tsx`, import it and render `<AppScreenshots title={l.screenshotsTitle} shots={l.screenshots} />` directly after `<ModuleList … />`.
- [ ] **Step 5: Run** the test. Expected: PASS. Run `pnpm tsc --noEmit`.
- [ ] **Step 6: Commit**

```bash
git add public/images/n400/public "src/components/n400-public/AppScreenshots.tsx" "src/app/[locale]/n400ready/page.tsx" "src/app/[locale]/n400ready/page.test.tsx"
git commit -m "feat(website): N400 Ready landing shows two real app screenshots per language

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Discovery: sitemap, llms.txt, footer/hero/service links, login noindex

**Files:**
- Modify: `src/app/sitemap.ts`, `src/app/sitemap.test.ts`
- Modify: `src/lib/seo/llms-txt.ts`, `src/app/llms.txt/route.test.ts`
- Modify: `src/components/layout/Footer.tsx`, `src/components/home/HeroSection.tsx`, `src/app/[locale]/services/immigration/page.tsx`
- Modify: `src/app/n400ready/(auth)/layout.tsx` (add metadata export)

- [ ] **Step 1: Failing sitemap test.** Append to the `describe` in `src/app/sitemap.test.ts`:

```ts
  it("lists the N400 Ready landing page in both languages", async () => {
    const landing = (await sitemap()).find((e) => e.url === "https://www.mannaos.com/vi/n400ready");
    expect(landing?.alternates?.languages).toEqual({
      en: "https://www.mannaos.com/en/n400ready",
      vi: "https://www.mannaos.com/vi/n400ready",
      "x-default": "https://www.mannaos.com/en/n400ready",
    });
    expect(landing?.lastModified).toBeUndefined();
  });
```

- [ ] **Step 2: Failing llms test.** In `src/app/llms.txt/route.test.ts`, delete the line `livePages.add("https://www.mannaos.com/n400ready");` and add:

```ts
  it("points crawlers at the public N400 Ready pages, not the login-gated app", async () => {
    const text = await body();
    expect(text).toContain("https://www.mannaos.com/en/n400ready");
    expect(text).toContain("https://www.mannaos.com/vi/n400ready");
    expect(text).not.toContain("https://www.mannaos.com/n400ready)");
  });
```

- [ ] **Step 3: Run.** `pnpm vitest run src/app/sitemap.test.ts src/app/llms.txt`. Expected: the new tests FAIL, and "links only to live canonical pages" FAILs (`/n400ready` is no longer whitelisted).
- [ ] **Step 4: Sitemap.** In `src/app/sitemap.ts`, add `...urls("/n400ready", 0.9, "monthly"),` directly after the `/services/insurance` line.
- [ ] **Step 5: llms.txt.** In `src/lib/seo/llms-txt.ts`, change the Tools line to use `${en("/n400ready")}` instead of `${SITE_URL}/n400ready`. In the "Tiếng Việt" list, add after the blog line:

```
- [N400 Ready: luyện thi quốc tịch Mỹ miễn phí](${vi("/n400ready")})
```

  If `SITE_URL` is no longer used in that file, remove its import.
- [ ] **Step 6: Run** the two test files. Expected: PASS.
- [ ] **Step 7: Links.**
  - `Footer.tsx`: in the Services `<ul>`, after the insurance `<li>`, add
    ```tsx
              <li>
                <Link href={`/${locale}/n400ready`} className="hover:text-primary transition-colors">
                  N400 Ready
                </Link>
              </li>
    ```
  - `HeroSection.tsx`: change `<Link href="/n400ready">` to ``<Link href={`/${locale}/n400ready`}>``. Check that the component already has `locale` in scope. If not, read how it receives `dictionary` and add `locale` the same way its parent passes props.
  - `services/immigration/page.tsx`: directly above `{/* CTA */}`, add
    ```tsx
        <p className="mb-8 text-center text-muted-foreground">
          <Link href={`/${locale}/n400ready`} className="text-primary font-semibold hover:underline">
            N400 Ready
          </Link>
          {locale === "vi" ? ": luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt." : ": free U.S. citizenship test practice."}
        </p>
    ```
- [ ] **Step 8: Login noindex.** `src/app/n400ready/(auth)/layout.tsx`: add (or merge into an existing `metadata`)
  ```ts
  export const metadata: Metadata = { robots: { index: false, follow: true } };
  ```
  with `import type { Metadata } from 'next';`. This covers `/n400ready/login` and `/n400ready/reset-password`. If the layout is a client component (`'use client'`), put the export in `src/app/n400ready/(auth)/login/layout.tsx` (new file that returns `children`) instead.
- [ ] **Step 9:** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint`. Expected: 0 failures.
- [ ] **Step 10: Commit**

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts src/lib/seo/llms-txt.ts src/app/llms.txt/route.test.ts src/components/layout/Footer.tsx src/components/home/HeroSection.tsx "src/app/[locale]/services/immigration/page.tsx" "src/app/n400ready/(auth)"
git commit -m "feat(website): N400 Ready landing in sitemap, llms.txt, footer and hero; login noindex

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: S1 integration check + ship

- [ ] **Step 1:** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint`. Expected: all 0.
- [ ] **Step 2:** Start the dev server in the background: `pnpm next dev --port 3877`. Then, without JavaScript:

```bash
curl -s http://localhost:3877/vi/n400ready | grep -c "<h1"
```
Expected `1`.
```bash
curl -s http://localhost:3877/vi/n400ready | grep -o '<link rel="canonical"[^>]*>'
```
Expected `href="https://www.mannaos.com/vi/n400ready"`.
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: vi-VN" http://localhost:3877/n400ready
```
Expected `307 http://localhost:3877/vi/n400ready`.
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: en-US" --cookie "n400_lang=vi" http://localhost:3877/n400ready
```
Expected `307 …/vi/n400ready`.
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3877/n400ready/practice
```
Expected `307 …/n400ready/login`.
```bash
curl -s -D - -o /dev/null "http://localhost:3877/n400ready/login?lang=en" | grep -iE "^(location|set-cookie)"
```
Expected a location without `lang=` and `set-cookie: n400_lang=en`.
```bash
curl -s http://localhost:3877/n400ready/login | grep -o '<meta name="robots"[^>]*>'
```
Expected `noindex`.

  Stop the dev server.
- [ ] **Step 3: Signed-in regression (read-only):** re-read the final `middleware.ts` and confirm `anonN400Destination` is only reachable inside `if (!user)`. Report this to the owner as checked by code reading. A signed-in browser check is the owner's.
- [ ] **Step 4: Ask the owner** for OK to merge to `main` and push (Vercel deploys). Do not push without a yes in that message.
- [ ] **Step 5: After deploy:** `curl -sI https://www.mannaos.com/vi/n400ready` → 200. `curl -s https://www.mannaos.com/sitemap.xml | grep -c n400ready` → at least 2. Tell the owner to request indexing for `https://www.mannaos.com/vi/n400ready` in Google Search Console.

---

## Slice S2 — USCIS D.C./territory answers + state pages

### Task 9: Location rules for D.C. and territories (app + data)

USCIS notes (verified against M-1778 via the live blog #2, 2026-10-16):
- Q23: D.C. and territory residents answer that they have **no U.S. senators**.
- Q29: territory residents may name their **Delegate / Resident Commissioner**, or say the territory has no voting representative. `reps-data.ts` already holds the delegates. No change.
- Q61: D.C. residents answer that **D.C. does not have a governor**. Territories name their governor.
- Q62: D.C. residents answer that **D.C. is not a state and has no capital**. Territories **name their capital**.

**Files:**
- Create: `src/lib/n400/location-rules.ts`, `src/lib/n400/location-rules.test.ts`
- Modify: `src/lib/n400/state-data.ts` (territory capitals, `N400_OFFICIALS_CHECKED_ON`)
- Modify: `src/lib/n400/quiz-engine.ts` (`correctAnswersFor`, `governorAudioUrl`, `capitalAudioUrl`), `src/lib/n400/quiz-engine.test.ts`
- Modify: `src/lib/n400/personalization.ts`, `src/lib/n400/personalization.test.ts`
- Create: `scripts/n400/verify-officials.mjs`

**Interfaces:**
- Produces:
  - `NON_STATE_CODES: ReadonlySet<StateCode>` (AS, DC, GU, MP, PR, VI)
  - `interface RuleAnswer { en: string; vi: string; oral: string[][] }`
  - `locationRuleAnswer(questionId: number, code: StateCode): RuleAnswer | null`
  - `N400_OFFICIALS_CHECKED_ON: string` (ISO date) exported from `state-data.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/lib/n400/location-rules.test.ts
import { describe, expect, it } from 'vitest';
import { NON_STATE_CODES, locationRuleAnswer } from './location-rules';

describe('locationRuleAnswer (USCIS notes for D.C. and territories)', () => {
  it('has no rule for the 50 states', () => {
    for (const id of [23, 29, 61, 62]) expect(locationRuleAnswer(id, 'TX')).toBeNull();
  });

  it('D.C. has no senators, no governor, no capital', () => {
    expect(locationRuleAnswer(23, 'DC')).toMatchObject({ en: 'D.C. has no U.S. senators', vi: 'D.C. không có thượng nghị sĩ Hoa Kỳ' });
    expect(locationRuleAnswer(61, 'DC')).toMatchObject({ en: 'D.C. does not have a governor', vi: 'D.C. không có thống đốc' });
    expect(locationRuleAnswer(62, 'DC')).toMatchObject({
      en: 'D.C. is not a state and does not have a capital',
      vi: 'D.C. không phải tiểu bang nên không có thủ phủ',
    });
  });

  it('territories have no senators but keep their governor and capital', () => {
    expect(locationRuleAnswer(23, 'GU')).toMatchObject({ en: 'Guam has no U.S. senators', vi: 'Guam không có thượng nghị sĩ Hoa Kỳ' });
    expect(locationRuleAnswer(61, 'GU')).toBeNull();
    expect(locationRuleAnswer(62, 'PR')).toBeNull();
  });

  it('never applies to Q29 (delegates live in reps-data)', () => {
    for (const code of NON_STATE_CODES) expect(locationRuleAnswer(29, code)).toBeNull();
  });
});
```

  Add to `quiz-engine.test.ts`. The import block at the top gets `governorAudioUrl, capitalAudioUrl`, and these go in a new `describe`:

```ts
describe('D.C. and territories (USCIS notes)', () => {
  const q = (id: number) => N400_QUESTIONS_BY_ID.get(id)!;

  it('teaches the rule sentence instead of a name or nothing', () => {
    expect(correctAnswersFor(q(23), 'DC')).toEqual([{ en: 'D.C. has no U.S. senators', vi: 'D.C. không có thượng nghị sĩ Hoa Kỳ' }]);
    expect(correctAnswersFor(q(61), 'DC')).toEqual([{ en: 'D.C. does not have a governor', vi: 'D.C. không có thống đốc' }]);
    expect(correctAnswersFor(q(62), 'DC')).toEqual([
      { en: 'D.C. is not a state and does not have a capital', vi: 'D.C. không phải tiểu bang nên không có thủ phủ' },
    ]);
    expect(correctAnswersFor(q(62), 'GU')).toEqual([{ en: 'Hagåtña', vi: 'Hagåtña' }]);
    expect(correctAnswersFor(q(61), 'PR')[0].en).toBe('Jenniffer González-Colón');
  });

  it('builds 4 options with exactly one correct for every D.C./territory location question', () => {
    for (const code of ['AS', 'DC', 'GU', 'MP', 'PR', 'VI'] as const) {
      for (const id of [23, 61, 62]) {
        const opts = buildOptions(q(id), code, `rule-${id}-${code}`);
        expect(opts).toHaveLength(4);
        expect(opts.filter((o) => o.isCorrect)).toHaveLength(1);
      }
    }
  });

  it('plays no name audio that contradicts the rule', () => {
    expect(governorAudioUrl('DC')).toBeNull();
    expect(governorAudioUrl('GU')).not.toBeNull();
    expect(capitalAudioUrl('GU')).toBeNull();
    expect(capitalAudioUrl('DC')).toBeNull();
    expect(capitalAudioUrl('TX')).not.toBeNull();
  });
});
```

  Add to `personalization.test.ts`:

```ts
  it('shows the USCIS rule instead of a D.C. governor', () => {
    expect(buildCivicsPersonalization('DC', 0, 'vi')!.governor).toBe('D.C. không có thống đốc');
    expect(buildCivicsPersonalization('DC', 0, 'en')!.governor).toBe('D.C. does not have a governor');
    expect(buildCivicsPersonalization('GU', 0, 'en')!.capital).toBe('Hagåtña');
  });
```

- [ ] **Step 2: Run.** `pnpm vitest run src/lib/n400/location-rules.test.ts src/lib/n400/quiz-engine.test.ts src/lib/n400/personalization.test.ts`. Expected: new tests FAIL. Also check for existing tests that pinned the old D.C. behavior: `grep -rn "Bowser" src --include='*.test.ts'`. Update any you find to the rule and note them in the commit message.

- [ ] **Step 3: Implement `location-rules.ts`**

```ts
// src/lib/n400/location-rules.ts
// USCIS 2025 civics test (M-1778) notes for places that are not states:
// D.C. and territory residents have no U.S. senators (Q23); D.C. has no
// governor (Q61) and, not being a state, no capital (Q62). Territories keep
// their governor and name their capital; Q29 delegates are in reps-data.
import { STATES_BY_CODE, type StateCode } from './state-data';

export const NON_STATE_CODES: ReadonlySet<StateCode> = new Set<StateCode>(['AS', 'DC', 'GU', 'MP', 'PR', 'VI']);

export interface RuleAnswer {
  en: string;
  vi: string;
  /** Oral grading alternatives (any-of; each inner array = parts that are all required). */
  oral: string[][];
}

function placeName(code: StateCode, lang: 'en' | 'vi'): string {
  if (code === 'DC') return 'D.C.';
  const s = STATES_BY_CODE[code];
  return lang === 'en' ? s.nameEn : s.nameVi;
}

export function locationRuleAnswer(questionId: number, code: StateCode): RuleAnswer | null {
  if (!NON_STATE_CODES.has(code)) return null;
  if (questionId === 23) {
    return {
      en: `${placeName(code, 'en')} has no U.S. senators`,
      vi: `${placeName(code, 'vi')} không có thượng nghị sĩ Hoa Kỳ`,
      oral: [['no senator'], ['not senator']],
    };
  }
  if (code !== 'DC') return null;
  if (questionId === 61) {
    return { en: 'D.C. does not have a governor', vi: 'D.C. không có thống đốc', oral: [['no governor'], ['not governor']] };
  }
  if (questionId === 62) {
    return {
      en: 'D.C. is not a state and does not have a capital',
      vi: 'D.C. không phải tiểu bang nên không có thủ phủ',
      oral: [['not state'], ['no capital'], ['not capital']],
    };
  }
  return null;
}
```

- [ ] **Step 4: Data.** In `state-data.ts`, set the territory capitals and add the date constant directly above `export const STATES`:

```ts
// Date the senators, representatives and governors below (and reps-data.ts)
// were last checked against senate.gov, clerk.house.gov and the states'
// official sites. Shown on the public state pages. Re-check after the
// 2026-11-03 election, once the winners take office (January 2027).
export const N400_OFFICIALS_CHECKED_ON = '2026-10-16';
```

  Capitals: AS `'Pago Pago'`, GU `'Hagåtña'`, MP `'Saipan'`, PR `'San Juan'`, VI `'Charlotte Amalie'`. Before saving, confirm each on the territory government's own site (americansamoa.gov, guam.gov, gov.mp, pr.gov, vi.gov) and note any difference for the owner. If any official cannot be confirmed in Step 8, set the date to the day the check actually passes.

- [ ] **Step 5: Use the rules.** In `quiz-engine.ts`:
  - add `import { NON_STATE_CODES, locationRuleAnswer } from './location-rules';`
  - in `correctAnswersFor`, directly after `if (!info) return [];`, add:
    ```ts
    const rule = locationRuleAnswer(question.id, stateCode);
    if (rule) return [{ en: rule.en, vi: rule.vi }];
    ```
  - `governorAudioUrl`: change `if (!info) return null;` to `if (!info || locationRuleAnswer(61, stateCode)) return null;`
  - `capitalAudioUrl`: change `if (!info || !info.capital) return null;` to `if (!info || !info.capital || NON_STATE_CODES.has(stateCode)) return null;` (no capital recordings exist for territories).

  In `personalization.ts`:
  - add `import { locationRuleAnswer } from './location-rules';`
  - inside `buildCivicsPersonalization`, before the `return`, add `const governorRule = locationRuleAnswer(61, info.code);`
  - set `governor: governorRule ? governorRule[lang] : info.governor,`

- [ ] **Step 6: Run** the three test files. Expected: PASS. Then run `pnpm vitest run src/lib/n400` to catch other suites (full-interview, section-mock-items, civics-mock-*) that depend on `correctAnswersFor`. Expected: PASS. If a distractor equals a rule sentence or `buildOptions` returns fewer than 4 options, fix the distractor filtering in `quiz-engine.ts`, not the test.

- [ ] **Step 7: Officials check script.** Create `scripts/n400/verify-officials.mjs`. It fetches `https://www.senate.gov/general/contact_information/senators_cfm.xml` and `https://clerk.house.gov/xml/lists/MemberData.xml` and compares them with the data files. It reads the `.ts` data as text with a regex, so it needs no TS loader:

```js
// scripts/n400/verify-officials.mjs
// Compares state-data.ts senators and reps-data.ts House members with the
// official XML lists. Read-only. Run from apps/website:
//   node scripts/n400/verify-officials.mjs
// Prints mismatches; exit code 1 if any. Governors are checked by hand.
import { readFileSync } from 'node:fs';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const lastName = (full) => norm(full.trim().split(/\s+/).pop());

const stateSrc = readFileSync('src/lib/n400/state-data.ts', 'utf8');
const repsSrc = readFileSync('src/lib/n400/reps-data.ts', 'utf8');

const ourSenators = {};
for (const m of stateSrc.matchAll(/code: '([A-Z]{2})'[^\n]*senators: \[([^\]]*)\]/g)) {
  ourSenators[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => lastName(x[1])).sort();
}
const ourReps = {};
for (const m of repsSrc.matchAll(/stateCode: "([A-Z]{2})" as StateCode, districtNumber: (\d+), name: "([^"]+)"/g)) {
  ourReps[`${m[1]}-${Number(m[2])}`] = lastName(m[3]);
}

const senXml = await (await fetch('https://www.senate.gov/general/contact_information/senators_cfm.xml')).text();
const offSenators = {};
for (const m of senXml.matchAll(/<member>[\s\S]*?<last_name>([^<]+)<\/last_name>[\s\S]*?<state>([A-Z]{2})<\/state>[\s\S]*?<\/member>/g)) {
  (offSenators[m[2]] ??= []).push(norm(m[1]));
}

const houseXml = await (await fetch('https://clerk.house.gov/xml/lists/MemberData.xml')).text();
const offReps = {};
for (const m of houseXml.matchAll(/<member>[\s\S]*?<statedistrict>([A-Z]{2})(\d{2})<\/statedistrict>[\s\S]*?<lastname>([^<]*)<\/lastname>[\s\S]*?<\/member>/g)) {
  if (m[3]) offReps[`${m[1]}-${Number(m[2])}`] = norm(m[3]);
}

const problems = [];
for (const [st, names] of Object.entries(offSenators)) {
  const ours = ourSenators[st] ?? [];
  if (JSON.stringify(ours) !== JSON.stringify([...names].sort())) problems.push(`Senate ${st}: ours ${ours} vs official ${names}`);
}
for (const [key, name] of Object.entries(offReps)) {
  if (ourReps[key] !== name) problems.push(`House ${key}: ours ${ourReps[key] ?? '(none)'} vs official ${name}`);
}
console.log(problems.length ? problems.join('\n') : 'All senators and House members match.');
process.exit(problems.length ? 1 : 0);
```

  Districts numbered `00` in the House XML (at-large and delegates) map to `districtNumber 0` in `reps-data.ts`. Vacant seats have an empty `<lastname>` and are skipped. If the XML tag names differ from the regexes, fetch once, look at one `<member>` element, and adjust the regex (not the data).

- [ ] **Step 8: Run it.** `node scripts/n400/verify-officials.mjs`. For each mismatch, fix the data only if it's a real change in office. That means regenerating `reps-data.ts` from `scripts/n400/reps-2025.csv` via `scripts/n400-build-reps.mjs`, never hand-editing the generated file. Then report to the owner: the list of changes, and that changed people have no recorded audio (the app shows text only for them). Also check the 56 governors by hand against the National Governors Association list (nga.org/governors) and fix `state-data.ts`. **If no change is needed, say so.** Then set `N400_OFFICIALS_CHECKED_ON` to the day this step passed.
- [ ] **Step 9:** `pnpm vitest run && pnpm tsc --noEmit`. Expected: 0.
- [ ] **Step 10: Commit** (two commits: the script is its own logical change)

```bash
git add scripts/n400/verify-officials.mjs
git commit -m "chore(website): script to check N400 senators and House members against official lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/lib/n400/location-rules.ts src/lib/n400/location-rules.test.ts src/lib/n400/state-data.ts src/lib/n400/quiz-engine.ts src/lib/n400/quiz-engine.test.ts src/lib/n400/personalization.ts src/lib/n400/personalization.test.ts
git commit -m "fix(website): N400 teaches the USCIS answers for D.C. and territories (no senators, no D.C. governor/capital, territory capitals)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  If Step 8 changed `reps-data.ts` or other `state-data.ts` names, commit those separately as `fix(website): N400 officials re-checked <date>`.

### Task 10: Voice grading for rule answers

**Files:**
- Modify: `src/lib/n400/oral/get-oral-config.ts`
- Test: `src/lib/n400/oral/get-oral-config.test.ts` (create if it does not exist; otherwise append)

**Interfaces:**
- Consumes: `locationRuleAnswer` (Task 9), `gradeOralAnswer` (`src/lib/n400/oral/grade-oral.ts`).

- [ ] **Step 1: Failing test**

```ts
// src/lib/n400/oral/get-oral-config.test.ts (append a describe if the file exists)
import { describe, expect, it } from 'vitest';
import { getOralAnswerConfig } from './get-oral-config';
import { gradeOralAnswer } from './grade-oral';

const grade = (qid: number, code: 'DC' | 'GU' | 'TX', said: string) =>
  gradeOralAnswer(said, getOralAnswerConfig(qid, { stateCode: code, districtNumber: 0 })!).verdict;

describe('oral grading for D.C. and territory rule answers', () => {
  it('accepts the USCIS rule said out loud', () => {
    expect(grade(23, 'DC', 'D.C. has no senators')).toBe('correct');
    expect(grade(23, 'GU', 'Guam does not have senators')).toBe('correct');
    expect(grade(61, 'DC', 'Washington D.C. does not have a governor')).toBe('correct');
    expect(grade(62, 'DC', 'D.C. is not a state')).toBe('correct');
  });

  it('rejects the old taught name and the opposite statement', () => {
    expect(grade(61, 'DC', 'Muriel Bowser')).not.toBe('correct');
    expect(grade(23, 'DC', 'D.C. has two senators')).not.toBe('correct');
  });

  it('accepts a territory capital said without diacritics', () => {
    expect(grade(62, 'GU', 'Hagatna')).toBe('correct');
  });

  it('keeps state answers unchanged', () => {
    expect(grade(62, 'TX', 'Austin')).toBe('correct');
  });
});
```

- [ ] **Step 2: Run.** `pnpm vitest run src/lib/n400/oral/get-oral-config.test.ts`. Expected: the rule cases FAIL (today the config is built from `surnameOf("D.C. has no U.S. senators")`).
- [ ] **Step 3: Implement.** In `get-oral-config.ts`, add `import { locationRuleAnswer } from '../location-rules';` and, inside `if (q.isLocationBased) {`, directly after `if (!location) return null;`:

```ts
    // D.C./territory rule sentences are graded on their key words ("no senator"),
    // not on a surname like the people answers.
    const rule = locationRuleAnswer(qid, location.stateCode);
    if (rule) return { type: 'single', alternatives: rule.oral };
```

- [ ] **Step 4: Run.** Expected: PASS. If "does not have" fails because the normalizer turns it into something other than `not`, read `normalizeTokens` in `oral/normalize.ts` and add the matching alternative (for example `['dont senator']`) to `oral` in `location-rules.ts`. Keep the test sentences as they are. If "Hagatna" fails, check how `normalize.ts` folds diacritics. Add `'Hagatna'` handling there only if a general fold is missing; otherwise report it.
- [ ] **Step 5:** `pnpm vitest run src/lib/n400`. Expected: PASS.
- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/oral/get-oral-config.ts src/lib/n400/oral/get-oral-config.test.ts src/lib/n400/location-rules.ts
git commit -m "fix(website): voice grading accepts the USCIS D.C./territory answers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: State page builder

**Files:**
- Create: `src/lib/n400/public/state-page.ts`, `src/lib/n400/public/state-page.test.ts`
- Modify: `src/lib/n400/public/copy.ts` (add the `state` block to `PublicCopy` and both locales)

**Interfaces:**
- Consumes: `correctAnswersFor` (quiz-engine), `NON_STATE_CODES` (Task 9), `REPS_BY_STATE` (reps-data), `N400_QUESTIONS_BY_ID`, `STATES_BY_CODE`, `stateSlug` (Task 1), `PUBLIC_COPY`.
- Produces:
  ```ts
  export interface PublicAnswer {
    questionId: 23 | 29 | 61 | 62;
    question: string;      // page language
    questionAlt: string;   // other language
    answers: string[];     // page language; [] only for Q29 in a state (the table answers it)
    note: string | null;   // page language
    star: boolean;         // 65/20 question
  }
  export interface DistrictRow { label: string; name: string }
  export interface StatePageData {
    code: StateCode; slug: string; name: string;
    answers: PublicAnswer[];        // always 4, in order 23, 29, 61, 62
    districts: DistrictRow[];       // states only; [] for D.C./territories
    related: { slug: string; name: string }[]; // 6 items, never the page's own state
  }
  export function buildStatePage(code: StateCode, locale: Locale): StatePageData;
  export const SIXTY_FIVE_TWENTY_LOCATION_IDS: ReadonlySet<number>; // {61}
  ```

- [ ] **Step 1: Add the `state` copy.** Extend `PublicCopy` with:

```ts
  state: {
    metaTitle: (name: string) => string;
    metaDescription: (p: { name: string; senators: string[]; governor: string; capital: string | null }) => string;
    metaDescriptionShort: (name: string) => string;
    h1: (name: string) => string;
    lead: (name: string, checkedOn: string) => string;
    questionLabel: (id: number) => string;
    q29StateAnswer: string;
    q29TerritoryNote: string;
    districtHeader: string;
    representativeHeader: string;
    findDistrictCta: string;
    houseFinderLabel: string;
    starNote: string;
    starLink: LinkItem;
    dataTitle: string;
    dataChecked: (date: string) => string;
    electionNotice: string;
    sourcesLabel: string;
    ctaTitle: (name: string) => string;
    relatedTitle: string;
    fullListLink: LinkItem;
    gridTitle: string;
    gridBody: string;
  };
```

  vi values:

```ts
    state: {
      metaTitle: (n) => `Thi quốc tịch Mỹ ${n}: thượng nghị sĩ, dân biểu, thống đốc, thủ phủ`,
      metaDescription: ({ name, senators, governor, capital }) =>
        `Đáp án thi quốc tịch Mỹ cho ${name}: thượng nghị sĩ ${senators.join(' và ')}; thống đốc ${governor}${capital ? `; thủ phủ ${capital}` : ''}.`,
      metaDescriptionShort: (n) => `Đáp án 4 câu hỏi theo nơi sống cho ${n} trong bài thi quốc tịch Mỹ 2025: thượng nghị sĩ, dân biểu, thống đốc, thủ phủ.`,
      h1: (n) => `Thi quốc tịch Mỹ ở ${n}: đáp án 4 câu hỏi theo nơi sống`,
      lead: (n, d) =>
        `Trong bài thi công dân 2025, câu 23, 29, 61 và 62 có đáp án tùy nơi bạn sống. Đây là đáp án cho ${n}, kiểm tra ngày ${d}. Hãy trả lời theo người đang giữ chức vào ngày phỏng vấn.`,
      questionLabel: (id) => `Câu ${id}`,
      q29StateAnswer: 'Tùy khu bầu cử (congressional district) của bạn — xem bảng dưới.',
      q29TerritoryNote: 'Theo USCIS, bạn cũng có thể trả lời rằng vùng lãnh thổ không có dân biểu có quyền biểu quyết.',
      districtHeader: 'Khu bầu cử',
      representativeHeader: 'Dân biểu',
      findDistrictCta: 'Không biết mình ở khu nào? Đăng ký N400 Ready và nhập địa chỉ, ứng dụng sẽ tìm giúp bạn.',
      houseFinderLabel: 'Hoặc tra trên house.gov',
      starNote: 'Câu có dấu ★ thuộc 20 câu dành cho người từ 65 tuổi có thẻ xanh từ 20 năm (diện 65/20).',
      starLink: { label: 'Thi quốc tịch Mỹ cho người trên 65 tuổi', href: '/vi/blog/thi-quoc-tich-my-cho-nguoi-tren-65-tuoi' },
      dataTitle: 'Dữ liệu cập nhật',
      dataChecked: (d) => `Kiểm tra ngày ${d}.`,
      electionNotice: 'Bầu cử Quốc hội và thống đốc diễn ra ngày 3/11/2026; người đắc cử nhậm chức vào tháng 1/2027.',
      sourcesLabel: 'Nguồn',
      ctaTitle: (n) => `Luyện 128 câu với đáp án ${n} đã điền sẵn`,
      relatedTitle: 'Tiểu bang khác',
      fullListLink: { label: 'Xem đủ 128 câu hỏi', href: '/vi/blog/128-cau-hoi-thi-quoc-tich-my' },
      gridTitle: 'Chọn tiểu bang của bạn',
      gridBody: 'Xem đáp án câu 23, 29, 61 và 62 cho nơi bạn sống.',
    },
```

  en values:

```ts
    state: {
      metaTitle: (n) => `${n} citizenship test answers: senators, representative, governor, capital`,
      metaDescription: ({ name, senators, governor, capital }) =>
        `U.S. citizenship test answers for ${name}: senators ${senators.join(' and ')}; governor ${governor}${capital ? `; capital ${capital}` : ''}.`,
      metaDescriptionShort: (n) => `Answers to the 4 location-based questions of the 2025 U.S. citizenship test for ${n}: senators, representative, governor, capital.`,
      h1: (n) => `U.S. citizenship test in ${n}: answers to the 4 location-based questions`,
      lead: (n, d) =>
        `On the 2025 civics test, questions 23, 29, 61 and 62 depend on where you live. Here are the answers for ${n}, checked on ${d}. Answer with whoever holds the office on your interview day.`,
      questionLabel: (id) => `Question ${id}`,
      q29StateAnswer: 'Depends on your congressional district — see the table below.',
      q29TerritoryNote: 'USCIS also accepts saying that the territory has no voting representative in Congress.',
      districtHeader: 'District',
      representativeHeader: 'Representative',
      findDistrictCta: 'Not sure which district you are in? Sign up for N400 Ready and enter your address; the app finds it for you.',
      houseFinderLabel: 'Or look it up on house.gov',
      starNote: 'Questions marked ★ are among the 20 questions for applicants 65 or older with a green card for 20 years (65/20).',
      starLink: { label: 'USCIS: exceptions and accommodations', href: USCIS_TEST_PAGE },
      dataTitle: 'Data freshness',
      dataChecked: (d) => `Checked on ${d}.`,
      electionNotice: 'Congressional and governor elections are on November 3, 2026; winners take office in January 2027.',
      sourcesLabel: 'Sources',
      ctaTitle: (n) => `Practice all 128 questions with the ${n} answers filled in`,
      relatedTitle: 'Other states',
      fullListLink: { label: 'USCIS 2025 civics test questions (PDF)', href: USCIS_128_PDF },
      gridTitle: 'Choose your state',
      gridBody: 'See the answers to questions 23, 29, 61 and 62 for where you live.',
    },
```

  Dates are shown as `16/10/2026` (vi) and `October 16, 2026` (en). Add to `copy.ts`:

```ts
export function formatCheckedOn(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return locale === 'vi'
    ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
```

- [ ] **Step 2: Failing test**

```ts
// src/lib/n400/public/state-page.test.ts
import { describe, expect, it } from 'vitest';
import { STATES } from '../state-data';
import { buildStatePage } from './state-page';

describe('buildStatePage', () => {
  it('gives Texas its senators, district table, governor and capital', () => {
    const p = buildStatePage('TX', 'vi');
    expect(p.slug).toBe('texas');
    expect(p.answers.map((a) => a.questionId)).toEqual([23, 29, 61, 62]);
    expect(p.answers[0].answers).toEqual(['John Cornyn', 'Ted Cruz']);
    expect(p.answers[1].answers).toEqual([]);
    expect(p.districts.length).toBe(38);
    expect(p.districts[0]).toEqual({ label: '1', name: expect.any(String) });
    expect(p.answers[3].answers).toEqual(['Austin']);
    expect(p.answers.find((a) => a.star)?.questionId).toBe(61);
    expect(p.answers[0].question).toContain('thượng nghị sĩ');
    expect(p.answers[0].questionAlt).toContain('senator');
  });

  it('labels an at-large district "At-Large", never "0"', () => {
    const p = buildStatePage('WY', 'en');
    expect(p.districts).toEqual([{ label: 'At-Large', name: expect.any(String) }]);
  });

  it('uses the USCIS rules for D.C.', () => {
    const p = buildStatePage('DC', 'vi');
    expect(p.name).toBe('Washington, D.C.');
    expect(p.answers[0].answers).toEqual(['D.C. không có thượng nghị sĩ Hoa Kỳ']);
    expect(p.answers[1].answers).toEqual(['Eleanor Norton']);
    expect(p.answers[2].answers).toEqual(['D.C. không có thống đốc']);
    expect(p.answers[3].answers).toEqual(['D.C. không phải tiểu bang nên không có thủ phủ']);
    expect(p.districts).toEqual([]);
  });

  it('shows a territory delegate with the USCIS note, and its capital', () => {
    const p = buildStatePage('PR', 'en');
    expect(p.answers[1].answers).toEqual(['Pablo Hernandez']);
    expect(p.answers[1].note).toContain('no voting representative');
    expect(p.answers[3].answers).toEqual(['San Juan']);
  });

  it('never renders an empty or null answer on any of the 56 pages', () => {
    for (const s of STATES) {
      for (const locale of ['vi', 'en'] as const) {
        const p = buildStatePage(s.code, locale);
        for (const a of p.answers) {
          const shown = a.answers.length > 0 ? a.answers : p.districts.map((d) => d.name);
          expect(shown.length, `${s.code} Q${a.questionId}`).toBeGreaterThan(0);
          for (const text of shown) expect(text, `${s.code} Q${a.questionId}`).toMatch(/\S/);
          expect(JSON.stringify(a)).not.toMatch(/null"|undefined/);
        }
        expect(p.related).toHaveLength(6);
        expect(p.related.some((r) => r.slug === p.slug)).toBe(false);
      }
    }
  });
});
```

  Note: the `null"` regex catches a serialized `"null"` string. A JSON `null` in `note` is allowed and serializes as `null` without a quote. Before relying on the Texas district count (38), check it with `grep -c 'stateCode: "TX"' src/lib/n400/reps-data.ts` and use that number.

- [ ] **Step 3: Run.** `pnpm vitest run src/lib/n400/public/state-page.test.ts`. Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// src/lib/n400/public/state-page.ts
// Plain data for one public state page (spec §8). Answers come from the same
// functions the app teaches with (correctAnswersFor + location rules).
import type { Locale } from '@/lib/i18n/config';
import { correctAnswersFor } from '../quiz-engine';
import { NON_STATE_CODES } from '../location-rules';
import { N400_QUESTIONS_BY_ID } from '../questions-data';
import { REPS_BY_STATE } from '../reps-data';
import { STATES_BY_CODE, type StateCode } from '../state-data';
import { PUBLIC_COPY } from './copy';
import { stateSlug } from './state-slugs';

export interface PublicAnswer {
  questionId: 23 | 29 | 61 | 62;
  question: string;
  questionAlt: string;
  answers: string[];
  note: string | null;
  star: boolean;
}
export interface DistrictRow { label: string; name: string }
export interface StatePageData {
  code: StateCode;
  slug: string;
  name: string;
  answers: PublicAnswer[];
  districts: DistrictRow[];
  related: { slug: string; name: string }[];
}

/** Location-based questions that are in the 2025 65/20 set (blog #2 ★ list). */
export const SIXTY_FIVE_TWENTY_LOCATION_IDS: ReadonlySet<number> = new Set([61]);

// States with the largest Vietnamese-American communities, used for "Other states".
const RELATED_ORDER: StateCode[] = ['CA', 'TX', 'WA', 'FL', 'VA', 'GA', 'MA', 'PA'];

const IDS = [23, 29, 61, 62] as const;

export function buildStatePage(code: StateCode, locale: Locale): StatePageData {
  const info = STATES_BY_CODE[code];
  const copy = PUBLIC_COPY[locale].state;
  const isState = !NON_STATE_CODES.has(code);
  const name = locale === 'vi' ? info.nameVi : info.nameEn;
  const reps = [...(REPS_BY_STATE.get(code) ?? [])].sort((a, b) => a.districtNumber - b.districtNumber);

  const answers: PublicAnswer[] = IDS.map((id) => {
    const q = N400_QUESTIONS_BY_ID.get(id)!;
    const question = locale === 'vi' ? q.questionVi : q.questionEn;
    const questionAlt = locale === 'vi' ? q.questionEn : q.questionVi;
    const star = SIXTY_FIVE_TWENTY_LOCATION_IDS.has(id);
    if (id === 29 && isState) {
      return { questionId: id, question, questionAlt, answers: [], note: copy.q29StateAnswer, star };
    }
    const taught = correctAnswersFor(q, code, id === 29 ? 0 : null).map((a) => a[locale]);
    const note = id === 29 && code !== 'DC' ? copy.q29TerritoryNote : null;
    return { questionId: id, question, questionAlt, answers: taught, note, star };
  });

  const districts: DistrictRow[] = isState
    ? reps.map((r) => ({ label: r.districtNumber === 0 ? 'At-Large' : String(r.districtNumber), name: r.name }))
    : [];

  const related = RELATED_ORDER.filter((c) => c !== code)
    .slice(0, 6)
    .map((c) => ({ slug: stateSlug(c), name: locale === 'vi' ? STATES_BY_CODE[c].nameVi : STATES_BY_CODE[c].nameEn }));

  return { code, slug: stateSlug(code), name, answers, districts, related };
}
```

  Check `REPS_BY_STATE` is exported from `reps-data.ts` as a `Map<StateCode, RepInfo[]>` (quiz-engine already imports it). For D.C. Q29 the USCIS note is about territories, so D.C. shows only its delegate. If the owner wants the note on D.C. too, change the `code !== 'DC'` condition.

- [ ] **Step 5: Run.** Expected: PASS.
- [ ] **Step 6: Commit**

```bash
git add src/lib/n400/public/state-page.ts src/lib/n400/public/state-page.test.ts src/lib/n400/public/copy.ts
git commit -m "feat(website): N400 public pages — state page data builder and copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: State page routes, metadata, grid on the landing page, sitemap

**Files:**
- Modify: `src/lib/n400/public/seo.ts`, `seo.test.ts` (state metadata, JSON-LD, `electionNoticeActive`)
- Create: `src/components/n400-public/AnswerCard.tsx`, `DistrictTable.tsx`, `StateGrid.tsx`
- Create: `src/app/[locale]/n400ready/states/[state]/page.tsx`, `page.test.tsx`
- Create: `src/app/[locale]/n400ready/states/page.tsx`
- Modify: `src/app/[locale]/n400ready/page.tsx`, `page.test.tsx` (grid)
- Modify: `src/app/sitemap.ts`, `sitemap.test.ts`

**Interfaces:**
- Consumes: `buildStatePage`, `StatePageData` (Task 11), `ALL_STATE_SLUGS`, `stateFromSlug` (Task 1), `N400_OFFICIALS_CHECKED_ON` (Task 9), `formatCheckedOn` (Task 11), `breadcrumbJsonLd`, `faqJsonLd` (Task 4).
- Produces: `stateMetadata(code: StateCode, locale: Locale): Metadata`, `stateJsonLd(data: StatePageData, locale: Locale): Record<string, unknown>`, `electionNoticeActive(now: Date): boolean`.

- [ ] **Step 1: Failing SEO tests** (append to `seo.test.ts`):

```ts
import { STATES } from '../state-data';
import { buildStatePage } from './state-page';
import { electionNoticeActive, stateJsonLd, stateMetadata } from './seo';

describe('state metadata', () => {
  it('keeps every description at 160 characters or fewer', () => {
    for (const s of STATES) {
      for (const locale of ['vi', 'en'] as const) {
        const d = stateMetadata(s.code, locale).description ?? '';
        expect(d.length, `${s.code} ${locale}: ${d}`).toBeLessThanOrEqual(160);
        expect(d).not.toMatch(/null|undefined/);
      }
    }
  });

  it('has canonical + hreflang for the state URL', () => {
    expect(stateMetadata('TX', 'vi').alternates).toEqual({
      canonical: '/vi/n400ready/states/texas',
      languages: { en: '/en/n400ready/states/texas', vi: '/vi/n400ready/states/texas', 'x-default': '/en/n400ready/states/texas' },
    });
    expect(stateMetadata('TX', 'vi').title).toEqual({ absolute: 'Thi quốc tịch Mỹ Texas: thượng nghị sĩ, dân biểu, thống đốc, thủ phủ' });
  });

  it('names the officials in the description when it fits, and never for D.C./territories', () => {
    expect(stateMetadata('TX', 'en').description).toContain('Cornyn');
    expect(stateMetadata('DC', 'en').description).not.toContain('Bowser');
  });
});

describe('state JSON-LD', () => {
  it('marks up the four visible Q/A pairs and a three-step breadcrumb', () => {
    const data = buildStatePage('TX', 'vi');
    const graph = stateJsonLd(data, 'vi')['@graph'] as Record<string, unknown>[];
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(faq.map((f) => f.name)).toEqual(data.answers.map((a) => a.question));
    expect(faq[1].acceptedAnswer.text).toContain(data.districts[0].name);
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement as { item: string }[];
    expect(crumbs.map((c) => c.item)).toEqual([
      'https://www.mannaos.com/vi',
      'https://www.mannaos.com/vi/n400ready',
      'https://www.mannaos.com/vi/n400ready/states/texas',
    ]);
  });
});

describe('electionNoticeActive', () => {
  it('shows until the end of January 2027', () => {
    expect(electionNoticeActive(new Date('2026-10-16T00:00:00Z'))).toBe(true);
    expect(electionNoticeActive(new Date('2027-01-31T23:00:00Z'))).toBe(true);
    expect(electionNoticeActive(new Date('2027-02-01T00:00:00Z'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** (append to `seo.ts`):

```ts
import { STATES_BY_CODE, type StateCode } from '../state-data';
import { NON_STATE_CODES } from '../location-rules';
import { stateSlug } from './state-slugs';
import type { StatePageData } from './state-page';

export function stateMetadata(code: StateCode, locale: Locale): Metadata {
  const info = STATES_BY_CODE[code];
  const c = PUBLIC_COPY[locale].state;
  const name = locale === 'vi' ? info.nameVi : info.nameEn;
  const full = NON_STATE_CODES.has(code)
    ? null
    : c.metaDescription({ name, senators: info.senators, governor: info.governor, capital: info.capital });
  const description = full && full.length <= 160 ? full : c.metaDescriptionShort(name);
  const path = `/n400ready/states/${stateSlug(code)}`;
  return {
    title: { absolute: c.metaTitle(name) },
    description,
    alternates: localeAlternates(locale, path),
    openGraph: { type: 'website', url: `/${locale}${path}`, title: c.metaTitle(name), description },
  };
}

export function stateJsonLd(data: StatePageData, locale: Locale): Record<string, unknown> {
  const c = PUBLIC_COPY[locale];
  const faq = data.answers.map((a) => ({
    q: a.question,
    a: [...(a.answers.length > 0 ? a.answers : data.districts.map((d) => `${d.label}: ${d.name}`)), a.note]
      .filter(Boolean)
      .join('; '),
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: c.home, path: `/${locale}` },
        { name: 'N400 Ready', path: `/${locale}/n400ready` },
        { name: data.name, path: `/${locale}/n400ready/states/${data.slug}` },
      ]),
      faqJsonLd(faq),
    ],
  };
}

const ELECTION_NOTICE_UNTIL = Date.parse('2027-02-01T00:00:00Z');
export function electionNoticeActive(now: Date): boolean {
  return now.getTime() < ELECTION_NOTICE_UNTIL;
}
```

  For a state, the FAQ answer to Q29 lists every district (`"1: Name; 2: Name; …"`). That's long for California but true to the visible table.
- [ ] **Step 4: Run.** Expected: PASS. If some vi `metaDescriptionShort` exceeds 160 for a long territory name, shorten the template string and rerun.
- [ ] **Step 5: Components**

```tsx
// src/components/n400-public/AnswerCard.tsx
import type { PublicAnswer } from '@/lib/n400/public/state-page';

export function AnswerCard({ label, a }: { label: string; a: PublicAnswer }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {label}{a.star ? ' ★' : ''}
      </p>
      <h2 className="mt-1 text-lg font-bold text-charcoal">{a.question}</h2>
      <p className="text-sm text-muted-foreground italic">{a.questionAlt}</p>
      {a.answers.length > 0 && (
        <ul className="mt-3 space-y-1">
          {a.answers.map((t) => (
            <li key={t} className="font-semibold text-charcoal">{t}</li>
          ))}
        </ul>
      )}
      {a.note && <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>}
    </div>
  );
}
```

```tsx
// src/components/n400-public/DistrictTable.tsx
import type { DistrictRow } from '@/lib/n400/public/state-page';

export function DistrictTable({ rows, districtHeader, repHeader }: { rows: DistrictRow[]; districtHeader: string; repHeader: string }) {
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{districtHeader}</th>
          <th className="py-1 font-medium">{repHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-border">
            <td className="py-1 pr-4">{r.label}</td>
            <td className="py-1 text-charcoal">{r.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```tsx
// src/components/n400-public/StateGrid.tsx
import Link from 'next/link';

export function StateGrid({ locale, title, body, states }: { locale: string; title: string; body: string; states: { slug: string; name: string }[] }) {
  return (
    <section id="states" className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4">{body}</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        {states.map((s) => (
          <li key={s.slug}>
            <Link href={`/${locale}/n400ready/states/${s.slug}`} className="hover:text-primary">{s.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

  Each answer card's question is an `<h2>`, so the page keeps one `<h1>`.

- [ ] **Step 6: Failing route test**

```tsx
// src/app/[locale]/n400ready/states/[state]/page.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatePage, { generateStaticParams } from './page';

const render = async (locale: string, state: string) =>
  renderToStaticMarkup(await StatePage({ params: Promise.resolve({ locale, state }) }));

describe('/[locale]/n400ready/states/[state]', () => {
  it('pre-renders 56 pages per locale', async () => {
    expect(await generateStaticParams({ params: { locale: 'vi' } })).toHaveLength(56);
  });

  it('server-renders the four Texas answers with one h1 and the checked date', async () => {
    const h = await render('vi', 'texas');
    expect(h.match(/<h1/g)).toHaveLength(1);
    for (const t of ['John Cornyn', 'Ted Cruz', 'Austin', 'Kiểm tra ngày', 'house.gov', 'uscis.gov/citizenship/testupdates']) {
      expect(h).toContain(t);
    }
    expect(h).toContain('/n400ready/login?lang=vi');
  });

  it('renders D.C. with the USCIS rule answers', async () => {
    const h = await render('en', 'district-of-columbia');
    expect(h).toContain('D.C. does not have a governor');
    expect(h).not.toContain('Muriel Bowser');
  });
});
```

  An unknown slug returns 404 through `dynamicParams = false`, which only the dev server can show; that's checked by curl in Task 14.

- [ ] **Step 7: Route**

```tsx
// src/app/[locale]/n400ready/states/[state]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/config';
import { N400_OFFICIALS_CHECKED_ON } from '@/lib/n400/state-data';
import { PUBLIC_COPY, formatCheckedOn } from '@/lib/n400/public/copy';
import { buildStatePage } from '@/lib/n400/public/state-page';
import { ALL_STATE_SLUGS, stateFromSlug } from '@/lib/n400/public/state-slugs';
import { electionNoticeActive, stateJsonLd, stateMetadata } from '@/lib/n400/public/seo';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { AnswerCard } from '@/components/n400-public/AnswerCard';
import { CtaBlock } from '@/components/n400-public/CtaBlock';
import { Disclosure } from '@/components/n400-public/Disclosure';
import { DistrictTable } from '@/components/n400-public/DistrictTable';

type Props = { params: Promise<{ locale: string; state: string }> };

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  void params;
  return ALL_STATE_SLUGS.map((state) => ({ state }));
}

async function resolve(params: Props['params']) {
  const { locale, state } = await params;
  const code = stateFromSlug(state);
  if (!isValidLocale(locale) || !code) notFound();
  return { locale, code };
}

export async function generateMetadata({ params }: Props) {
  const { locale, code } = await resolve(params);
  return stateMetadata(code, locale);
}

export default async function N400StatePage({ params }: Props) {
  const { locale, code } = await resolve(params);
  const c = PUBLIC_COPY[locale];
  const s = c.state;
  const data = buildStatePage(code, locale);
  const checked = formatCheckedOn(N400_OFFICIALS_CHECKED_ON, locale);
  const linkCls = 'text-primary font-semibold hover:underline';

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(stateJsonLd(data, locale)) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link href={`/${locale}`} className="hover:text-primary">{c.home}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${locale}/n400ready`} className="hover:text-primary">N400 Ready</Link>
          <span className="mx-2">›</span>
          <span>{data.name}</span>
        </nav>

        <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-4 leading-tight">{s.h1(data.name)}</h1>
        <p className="text-lg text-muted-foreground mb-8">{s.lead(data.name, checked)}</p>

        <div className="space-y-4">
          {data.answers.map((a) => (
            <div key={a.questionId}>
              <AnswerCard label={s.questionLabel(a.questionId)} a={a} />
              {a.questionId === 29 && data.districts.length > 0 && (
                <div className="mt-2 rounded-xl border border-border p-5">
                  <DistrictTable rows={data.districts} districtHeader={s.districtHeader} repHeader={s.representativeHeader} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {s.findDistrictCta}{' '}
                    <a href="https://www.house.gov/representatives/find-your-representative" className={linkCls} rel="noopener">
                      {s.houseFinderLabel}
                    </a>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {s.starNote} <Link href={s.starLink.href} className={linkCls}>{s.starLink.label}</Link>
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-charcoal mb-2">{s.dataTitle}</h2>
          <p className="text-muted-foreground">
            {s.dataChecked(checked)} {electionNoticeActive(new Date()) ? s.electionNotice : ''}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {s.sourcesLabel}:{' '}
            <a href="https://www.uscis.gov/citizenship/testupdates" className={linkCls} rel="noopener">uscis.gov/citizenship/testupdates</a>
            {' · '}
            <a href="https://www.senate.gov/senators/" className={linkCls} rel="noopener">senate.gov</a>
            {' · '}
            <a href="https://www.house.gov/representatives" className={linkCls} rel="noopener">house.gov</a>
          </p>
        </section>

        <div className="mt-12"><CtaBlock locale={locale} title={s.ctaTitle(data.name)} /></div>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-charcoal mb-3">{s.relatedTitle}</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {data.related.map((r) => (
              <li key={r.slug}><Link href={`/${locale}/n400ready/states/${r.slug}`} className={linkCls}>{r.name}</Link></li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href={`/${locale}/n400ready`} className={linkCls}>N400 Ready</Link>
            {' · '}
            <Link href={s.fullListLink.href} className={linkCls}>{s.fullListLink.label}</Link>
          </p>
        </section>

        <Disclosure text={c.disclosure} />
      </article>
    </div>
  );
}
```

  The spec lists "the state's official site" as a source. That needs a URL per state that isn't in the data, so it's left out here. Tell the owner, who can add a `website` field later if wanted.

- [ ] **Step 8: Index redirect**

```tsx
// src/app/[locale]/n400ready/states/page.tsx
import { permanentRedirect } from 'next/navigation';

export default async function StatesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/n400ready#states`);
}
```

- [ ] **Step 9: Grid on the landing page.** In `src/app/[locale]/n400ready/page.tsx`, import `StateGrid`, `STATES` and `stateSlug`, and directly after the `id="personal"` section render:

```tsx
        <StateGrid
          locale={locale}
          title={c.state.gridTitle}
          body={c.state.gridBody}
          states={STATES.map((s) => ({ slug: stateSlug(s.code), name: locale === 'vi' ? s.nameVi : s.nameEn }))}
        />
```

  Add to the landing vi test: `expect(h).toContain('/vi/n400ready/states/texas');`.

- [ ] **Step 10: Sitemap.** Failing test in `sitemap.test.ts`:

```ts
  it("lists all 56 N400 Ready state pages in both languages", async () => {
    const entries = await sitemap();
    const states = entries.filter((e) => e.url.includes("/n400ready/states/"));
    expect(states).toHaveLength(112);
    expect(states.find((e) => e.url === "https://www.mannaos.com/vi/n400ready/states/texas")?.alternates?.languages).toEqual({
      en: "https://www.mannaos.com/en/n400ready/states/texas",
      vi: "https://www.mannaos.com/vi/n400ready/states/texas",
      "x-default": "https://www.mannaos.com/en/n400ready/states/texas",
    });
  });
```

  Implement: in `sitemap.ts`, `import { ALL_STATE_SLUGS } from "@/lib/n400/public/state-slugs";` and after the `/n400ready` line add `...ALL_STATE_SLUGS.flatMap((slug) => urls(`/n400ready/states/${slug}`, 0.6, "monthly")),`.
- [ ] **Step 11: Run all.** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint`. Expected: 0. (The llms.txt test still passes because state pages are not linked from llms.txt.)
- [ ] **Step 12: Commit**

```bash
git add src/lib/n400/public/seo.ts src/lib/n400/public/seo.test.ts src/components/n400-public "src/app/[locale]/n400ready" src/app/sitemap.ts src/app/sitemap.test.ts
git commit -m "feat(website): 56 public N400 Ready state answer pages (vi + en) with grid, metadata and sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Links from live blog posts #2 and #3 (owner OK at this step)

The posts live in the prod `blog_posts` table (`content_vi`, Markdown). They are edited with one SQL statement each, only after the owner approves the exact text in that message.

- [ ] **Step 1: Read the live text.** Run with Supabase MCP `execute_sql` (read-only):

```sql
select slug_vi, position('Dấu **★** là 20 câu' in content_vi) as star_pos,
       position('[N400 Ready](/n400ready)' in content_vi) as app_pos
from blog_posts where slug_vi in ('128-cau-hoi-thi-quoc-tich-my', 'thi-quoc-tich-my-cho-nguoi-tren-65-tuoi');
```

  Note which anchors exist (both > 0) in each post.
- [ ] **Step 2: Propose to the owner** (in one message, wait for yes):
  - Post #2 (`128-cau-hoi-thi-quoc-tich-my`): add a new bullet to the "Đọc danh sách này thế nào?" list, right before the `Dấu **★**` bullet:
    `- Câu 23, 29, 61 và 62 có đáp án tùy nơi bạn sống. Xem [đáp án theo tiểu bang của bạn](/vi/n400ready#states).`
  - In both posts, change the first `[N400 Ready](/n400ready)` link to `[N400 Ready](/vi/n400ready)`.
- [ ] **Step 3: On yes, apply** (MCP `execute_sql`):

```sql
update blog_posts
set content_vi = replace(
      replace(content_vi, '- Dấu **★** là 20 câu', E'- Câu 23, 29, 61 và 62 có đáp án tùy nơi bạn sống. Xem [đáp án theo tiểu bang của bạn](/vi/n400ready#states).\n- Dấu **★** là 20 câu'),
      '[N400 Ready](/n400ready)', '[N400 Ready](/vi/n400ready)')
where slug_vi = '128-cau-hoi-thi-quoc-tich-my'
returning slug_vi, updated_at;

update blog_posts
set content_vi = replace(content_vi, '[N400 Ready](/n400ready)', '[N400 Ready](/vi/n400ready)')
where slug_vi = 'thi-quoc-tich-my-cho-nguoi-tren-65-tuoi'
returning slug_vi, updated_at;
```

  `replace` changes every occurrence of the app link in the post. That's intended: every in-article link to the app should land on the public page. Each statement must return exactly one row.
- [ ] **Step 4: Verify.** After 30 s (`revalidate = 30`): `curl -s https://www.mannaos.com/vi/blog/128-cau-hoi-thi-quoc-tich-my | grep -c "/vi/n400ready#states"` → `1`.
- [ ] **Step 5:** If the Markdown source files for these posts exist in the repo (`docs/content/blog/vi/`), apply the same text change there and commit `docs(content): blog #2/#3 link to the public N400 Ready pages`. Otherwise note in the ROADMAP line that the DB is the source.

### Task 14: S2 integration check, ROADMAP, ship

- [ ] **Step 1:** `pnpm vitest run && pnpm tsc --noEmit && pnpm eslint`. Expected: 0.
- [ ] **Step 2:** With the dev server running (`pnpm next dev --port 3877`):

```bash
curl -s http://localhost:3877/vi/n400ready/states/texas | grep -c "<h1"
```
Expected `1`.
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3877/vi/n400ready/states/atlantis
```
Expected `404`.
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3877/en/n400ready/states
```
Expected `308 …/en/n400ready#states`, or `308 …/en/n400ready` because curl drops the fragment.
```bash
curl -s http://localhost:3877/en/n400ready/states/district-of-columbia | grep -c "does not have a governor"
```
Expected ≥ 1.

  Extract the `application/ld+json` block of the Texas page and check that it parses: `node -e "JSON.parse(process.argv[1])" "$(curl -s http://localhost:3877/vi/n400ready/states/texas | sed -n 's/.*<script type="application\/ld+json">\(.*\)<\/script>.*/\1/p' | head -1)"`. Expected: no error.
- [ ] **Step 3: ROADMAP.** In `docs/ROADMAP.md`, add a checked line under the website SEO items:

  `- [x] **N400 Ready trang công khai — LIVE <date>**: /vi|en/n400ready (landing, 2 ảnh app) + 56×2 trang đáp án theo tiểu bang (câu 23/29/61/62), khách chưa đăng nhập vào /n400ready thấy landing; app dạy đúng đáp án USCIS cho D.C./vùng lãnh thổ; blog #2/#3 link sang. Spec specs/2026-10-16-n400ready-public-pages-design.md.`

  Add to the to-do section at the top:

  `- [ ] **Tháng 1/2027:** chạy \`node scripts/n400/verify-officials.mjs\` + kiểm thống đốc sau bầu cử 3/11/2026, sửa \`state-data.ts\`/\`reps-data.ts\`, đổi \`N400_OFFICIALS_CHECKED_ON\`.`
  `- [ ] **Owner:** GSC request indexing \`/vi/n400ready\` + 2–3 trang tiểu bang; ~8 tuần sau so sánh truy vấn /vi/n400ready* với blog #2.`
  `- [ ] **Follow-up:** đăng ký bằng email không ghi attribution (chỉ OAuth callback gọi \`n400_set_attribution\`).`

  Commit `docs: ROADMAP — N400 Ready public pages`.
- [ ] **Step 4: Ask the owner** for OK to merge and push. On yes, push, then verify on prod: `curl -sI https://www.mannaos.com/vi/n400ready/states/texas` → 200, and the sitemap contains `n400ready/states/` 112 times (`curl -s https://www.mannaos.com/sitemap.xml | grep -o "n400ready/states/[a-z-]*" | wc -l`).
- [ ] **Step 5:** Run Google's Rich Results Test on `https://www.mannaos.com/vi/n400ready` and one state page. Report the result.
