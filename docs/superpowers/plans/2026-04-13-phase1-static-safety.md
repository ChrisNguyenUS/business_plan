# Phase 1: Static Safety — Monorepo Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the MannaOS Turborepo monorepo with TypeScript strict mode, ESLint, and Prettier wired across all workspaces — zero type errors, zero lint errors — before any feature code is written.

**Architecture:** Turborepo monorepo at the repo root. Two workspace tiers: `apps/` (runnable applications) and `packages/` (shared configs). Phase 1 only scaffolds `apps/website` (Next.js 14 App Router) and two shared config packages. `apps/internal-app` is NOT created in Phase 1. All tooling is installed at its correct scope (root vs. app) to prevent dep leakage.

**Tech Stack:** Turborepo 2.x, Next.js 14 (App Router), TypeScript 5.x (strict), Tailwind CSS 3.x, ESLint 8.x, Prettier 3.x, pnpm workspaces.

---

## Scope Boundary Rules (read before every task)

| Scope | What goes here | What does NOT go here |
|---|---|---|
| **ROOT** | `turbo`, `prettier`, `typescript` (type-checking only), shared ESLint, workspace config | Next.js, React, Tailwind, any app-specific dep |
| **packages/tsconfig** | TypeScript `base.json`, `nextjs.json` configs | Any runtime dep; this package is never built |
| **packages/eslint-config** | ESLint rule sets, `eslint-config-next` re-export | Next.js runtime deps |
| **apps/website** | `next`, `react`, `tailwindcss`, app-specific ESLint/TS config | Deps that belong in root or packages |

---

## File Map

```
<repo-root>/                             ← existing git root (Business planning repo)
├── apps/
│   └── website/                         ← NEW: Next.js 14 app (created in Task 5)
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── layout.tsx           Root layout: dark bg, Inter font, locale param
│       │   │   └── page.tsx             Home placeholder
│       │   └── globals.css              Tailwind base + CSS custom properties
│       ├── middleware.ts                Locale detection (default EN)
│       ├── locales/
│       │   ├── en/common.json           EN placeholder keys
│       │   └── vi/common.json           VI placeholder keys
│       ├── tailwind.config.ts           Extended with MannaOS dark navy tokens
│       ├── tsconfig.json                Extends @mannaos/tsconfig/nextjs.json
│       ├── .eslintrc.json               Extends @mannaos/eslint-config/next
│       ├── next.config.ts               Minimal config
│       └── package.json                 app deps (next, react, tailwindcss, etc.)
├── packages/
│   ├── tsconfig/                        NEW: shared TypeScript config package
│   │   ├── base.json                    strict, ES2022, moduleResolution bundler
│   │   ├── nextjs.json                  extends base + Next.js specifics
│   │   └── package.json                 name: @mannaos/tsconfig
│   └── eslint-config/                   NEW: shared ESLint rules package
│       ├── index.js                     Base rules (no framework)
│       ├── next.js                      extends index + eslint-config-next
│       └── package.json                 name: @mannaos/eslint-config
├── turbo.json                           NEW: pipeline tasks (lint, type-check, build)
├── package.json                         MODIFIED: add workspaces, turbo, prettier devDeps
├── .prettierrc                          NEW: shared Prettier config
├── .prettierignore                      NEW: ignores .next, node_modules, etc.
└── docs/ROADMAP.md                      MODIFIED: Phase 1 → [x] in final task
```

---

## Task 1: Turborepo Root Setup [SCOPE: ROOT]

**Goal:** Turn the existing repo root into a pnpm workspace Turborepo monorepo.
**Done when:** `pnpm turbo --version` prints a version number from the repo root.

**Files:**
- Modify: `package.json`
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1.1: Check if pnpm is installed**

```bash
pnpm --version
```

Expected: a version string (e.g. `9.x.x`). If not installed: `npm install -g pnpm`.

- [ ] **Step 1.2: Initialise root package.json as private workspace root**

If `package.json` does not already exist at the repo root, create it. If it exists, merge these fields:

```json
{
  "name": "mannaos",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\" --ignore-path .prettierignore",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\" --ignore-path .prettierignore"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.3.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 1.3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 1.4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 1.5: Install root devDependencies**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm install
```

Expected: `node_modules/.pnpm` lock file created. No errors.

- [ ] **Step 1.6: Verify Turbo is reachable**

```bash
pnpm turbo --version
```

Expected output: `2.x.x` (or similar). No "command not found".

- [ ] **Step 1.7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml
git commit -m "chore: init turborepo monorepo root with pnpm workspaces"
```

---

## Task 2: Shared TypeScript Config Package [SCOPE: packages/tsconfig]

**Goal:** Create `@mannaos/tsconfig` — a shareable TypeScript config package with `base.json` and `nextjs.json` presets.
**Done when:** `packages/tsconfig/nextjs.json` can be extended by `apps/website/tsconfig.json` without errors.

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/nextjs.json`

- [ ] **Step 2.1: Create directory and package.json**

```bash
mkdir -p "/Users/anhnguyen/Obsidian/Business planning/packages/tsconfig"
```

`packages/tsconfig/package.json`:
```json
{
  "name": "@mannaos/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nextjs.json"]
}
```

- [ ] **Step 2.2: Create `base.json`**

`packages/tsconfig/base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "module": "ESNext",
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2.3: Create `nextjs.json`**

`packages/tsconfig/nextjs.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2017"],
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2.4: Commit**

```bash
git add packages/tsconfig/
git commit -m "chore: add @mannaos/tsconfig shared typescript config package"
```

---

## Task 3: Shared ESLint Config Package [SCOPE: packages/eslint-config]

**Goal:** Create `@mannaos/eslint-config` with a Next.js preset that wraps `eslint-config-next`.
**Done when:** `packages/eslint-config/next.js` exports a valid ESLint config object.

**Files:**
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/index.js`
- Create: `packages/eslint-config/next.js`

- [ ] **Step 3.1: Create directory and package.json**

```bash
mkdir -p "/Users/anhnguyen/Obsidian/Business planning/packages/eslint-config"
```

`packages/eslint-config/package.json`:
```json
{
  "name": "@mannaos/eslint-config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "files": ["index.js", "next.js"],
  "peerDependencies": {
    "eslint": "^8.0.0"
  },
  "devDependencies": {
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  }
}
```

- [ ] **Step 3.2: Create `index.js` — base rules**

`packages/eslint-config/index.js`:
```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }]
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "*.config.js",
    "*.config.ts"
  ]
};
```

- [ ] **Step 3.3: Create `next.js` — Next.js preset**

`packages/eslint-config/next.js`:
```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./index.js",
    "next/core-web-vitals"
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "error"
  }
};
```

- [ ] **Step 3.4: Install peer deps in the package**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/packages/eslint-config"
pnpm install
```

- [ ] **Step 3.5: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add packages/eslint-config/
git commit -m "chore: add @mannaos/eslint-config shared eslint rules package"
```

---

## Task 4: Prettier + Root Gitignore [SCOPE: ROOT]

**Goal:** Shared Prettier config and updated `.gitignore` so no build artifacts are tracked.
**Done when:** `pnpm format:check` from root exits 0 on the files added so far.

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `.gitignore`

- [ ] **Step 4.1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": []
}
```

- [ ] **Step 4.2: Create `.prettierignore`**

```
node_modules
.next
dist
pnpm-lock.yaml
*.md
public
```

- [ ] **Step 4.3: Update `.gitignore`** (merge with existing content)

Ensure these lines are present in `.gitignore`:
```
# Turborepo
.turbo

# Next.js
.next/
out/

# Node
node_modules/

# Env files
.env*.local
.env

# OS
.DS_Store
```

- [ ] **Step 4.4: Verify format check passes**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm format:check
```

Expected: exit 0 (or lists only files that need formatting — fix those before moving on).

- [ ] **Step 4.5: Commit**

```bash
git add .prettierrc .prettierignore .gitignore
git commit -m "chore: add prettier config and update gitignore"
```

---

## Task 5: Bootstrap Next.js 14 in apps/website [SCOPE: apps/website]

**Goal:** Create a clean Next.js 14 App Router app inside `apps/website/` with TypeScript and Tailwind.
**Done when:** `cd apps/website && pnpm dev` starts without errors on port 3000.

**Files:**
- Create: `apps/website/` (entire Next.js scaffold)

- [ ] **Step 5.1: Scaffold the app**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm dlx create-next-app@14 apps/website \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted about "Would you like to use Turbopack?": select **No** (we use Turbo from root, not Next.js Turbopack in dev for now — avoid confusion).

- [ ] **Step 5.2: Clean default boilerplate**

Remove the default CSS that ships with create-next-app from `apps/website/app/globals.css` (keep only Tailwind directives). Replace `apps/website/app/page.tsx` with a minimal placeholder:

`apps/website/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A1628] text-white">
      <h1 className="text-4xl font-bold">MannaOS.com</h1>
      <p className="mt-4 text-[#E2E8F0]">Phase 1A — Coming soon</p>
    </main>
  );
}
```

`apps/website/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5.3: Add `type-check` script to apps/website/package.json**

Edit `apps/website/package.json` and add to `"scripts"`:
```json
"type-check": "tsc --noEmit"
```

Full scripts block should look like:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

- [ ] **Step 5.4: Test dev server starts**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website"
pnpm dev
```

Expected: `▲ Next.js 14.x.x` and `Local: http://localhost:3000`. No TypeScript or module errors.

Stop with Ctrl+C.

- [ ] **Step 5.5: Commit**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git add apps/website/
git commit -m "chore: bootstrap next.js 14 app in apps/website"
```

---

## Task 6: Wire Shared TypeScript Config into apps/website [SCOPE: apps/website]

**Goal:** `apps/website/tsconfig.json` extends `@mannaos/tsconfig/nextjs.json` instead of the default Next.js config.
**Done when:** `turbo type-check` from root exits 0 with no TypeScript errors.

**Files:**
- Modify: `apps/website/tsconfig.json`
- Modify: `apps/website/package.json`

- [ ] **Step 6.1: Add @mannaos/tsconfig as devDependency in apps/website**

`apps/website/package.json` — add to `devDependencies`:
```json
"@mannaos/tsconfig": "workspace:*"
```

- [ ] **Step 6.2: Update apps/website/tsconfig.json**

Replace the entire file content:
```json
{
  "extends": "@mannaos/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6.3: Re-install to link workspace packages**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm install
```

- [ ] **Step 6.4: Run type-check from root**

```bash
pnpm turbo type-check
```

Expected: `Tasks: 1 successful, 1 total` with 0 TypeScript errors. If errors appear, fix them before continuing.

- [ ] **Step 6.5: Commit**

```bash
git add apps/website/tsconfig.json apps/website/package.json pnpm-lock.yaml
git commit -m "chore: wire apps/website tsconfig to @mannaos/tsconfig shared preset"
```

---

## Task 7: Wire Shared ESLint Config into apps/website [SCOPE: apps/website]

**Goal:** `apps/website/.eslintrc.json` extends `@mannaos/eslint-config/next` instead of the default Next.js ESLint.
**Done when:** `turbo lint` from root exits 0 with zero lint errors or warnings.

**Files:**
- Modify: `apps/website/.eslintrc.json`
- Modify: `apps/website/package.json`

- [ ] **Step 7.1: Add @mannaos/eslint-config as devDependency in apps/website**

`apps/website/package.json` — add to `devDependencies`:
```json
"@mannaos/eslint-config": "workspace:*"
```

- [ ] **Step 7.2: Replace apps/website/.eslintrc.json**

```json
{
  "root": true,
  "extends": ["@mannaos/eslint-config/next"],
  "settings": {
    "next": {
      "rootDir": "."
    }
  }
}
```

- [ ] **Step 7.3: Re-install to link workspace packages**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm install
```

- [ ] **Step 7.4: Run lint from root**

```bash
pnpm turbo lint
```

Expected: `Tasks: 1 successful, 1 total`. Zero errors. If there are errors in the default boilerplate files (e.g. unused imports in `layout.tsx`), fix them now.

- [ ] **Step 7.5: Commit**

```bash
git add apps/website/.eslintrc.json apps/website/package.json pnpm-lock.yaml
git commit -m "chore: wire apps/website eslint to @mannaos/eslint-config/next shared preset"
```

---

## Task 8: Tailwind Dark Theme Tokens [SCOPE: apps/website]

**Goal:** Extend Tailwind with the MannaOS dark navy design tokens from PRD §7 so they're available as utility classes.
**Done when:** `apps/website/app/page.tsx` uses the custom token classes and `pnpm dev` renders them correctly.

**Files:**
- Modify: `apps/website/tailwind.config.ts`
- Modify: `apps/website/app/globals.css`

- [ ] **Step 8.1: Update tailwind.config.ts with design tokens**

`apps/website/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MannaOS dark navy palette (PRD §7)
        navy: {
          950: "#060E1A",
          900: "#0A1628",
          700: "#1E3A5F",
        },
        accent: {
          blue: "#4F8EF7",
          purple: "#7B2FBE",
        },
        gold: "#F5A623",
        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "#E2E8F0",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #060E1A 0%, #0A1628 50%, #1E3A5F 100%)",
        "accent-gradient": "linear-gradient(135deg, #4F8EF7, #7B2FBE)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        glass: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 8.2: Update globals.css with Inter font import and CSS variables**

`apps/website/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-navy-950: #060e1a;
  --color-navy-900: #0a1628;
  --color-navy-700: #1e3a5f;
  --color-accent-blue: #4f8ef7;
  --color-accent-purple: #7b2fbe;
  --color-gold: #f5a623;
}

@layer base {
  body {
    background-color: theme("colors.navy.900");
    color: theme("colors.text-secondary");
  }
}
```

- [ ] **Step 8.3: Update page.tsx to use Tailwind tokens**

`apps/website/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-hero-gradient text-text-primary">
      <h1 className="text-4xl font-bold text-white">MannaOS.com</h1>
      <p className="mt-4 text-text-secondary">Phase 1A — Coming soon</p>
      <div className="mt-8 flex gap-4">
        <button className="rounded-lg bg-accent-gradient px-6 py-3 font-semibold text-white transition hover:scale-105">
          Đặt lịch miễn phí
        </button>
        <button className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-white/40">
          Our Services
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 8.4: Verify dev renders dark page correctly**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website"
pnpm dev
```

Visit `http://localhost:3000`. You should see a dark navy (#0A1628) background, white "MannaOS.com" heading, muted white subtitle, and two buttons. Stop with Ctrl+C.

- [ ] **Step 8.5: Run full turbo pipeline from root**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm turbo lint type-check
```

Expected: both tasks succeed with 0 errors.

- [ ] **Step 8.6: Commit**

```bash
git add apps/website/tailwind.config.ts apps/website/app/globals.css apps/website/app/page.tsx
git commit -m "chore: add mannaos dark navy design tokens to tailwind config"
```

---

## Task 9: [locale] App Router Directory Structure [SCOPE: apps/website]

**Goal:** Set up the `app/[locale]/` segment and `middleware.ts` for bilingual routing (EN default). `/en` and `/vi` both render without errors.
**Done when:** `http://localhost:3000` redirects to `/en`, and `http://localhost:3000/vi` also renders without errors.

**Files:**
- Create: `apps/website/app/[locale]/layout.tsx`
- Create: `apps/website/app/[locale]/page.tsx`
- Create: `apps/website/middleware.ts`
- Create: `apps/website/locales/en/common.json`
- Create: `apps/website/locales/vi/common.json`
- Delete: `apps/website/app/page.tsx` (moved into `[locale]`)

- [ ] **Step 9.1: Create apps/website/app/[locale]/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manna One Solution — One Stop, All Solutions",
  description:
    "Bilingual Vietnamese-English services: Tax, Insurance, Immigration, AI. Houston, TX.",
};

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={params.locale} className={inter.variable}>
      <body className="bg-navy-900 text-text-secondary antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9.2: Create apps/website/app/[locale]/page.tsx**

```tsx
export default function Home({ params }: { params: { locale: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-hero-gradient">
      <h1 className="text-4xl font-bold text-white">MannaOS.com</h1>
      <p className="mt-4 text-text-secondary">
        {params.locale === "vi" ? "Đang xây dựng…" : "Phase 1A — Coming soon"}
      </p>
    </main>
  );
}
```

- [ ] **Step 9.3: Delete the old root page.tsx**

```bash
rm "/Users/anhnguyen/Obsidian/Business planning/apps/website/app/page.tsx"
```

And remove the old `apps/website/app/layout.tsx` if it exists (it was generated by create-next-app and is now replaced by the `[locale]` layout):

```bash
rm -f "/Users/anhnguyen/Obsidian/Business planning/apps/website/app/layout.tsx"
```

- [ ] **Step 9.4: Create middleware.ts for locale detection**

`apps/website/middleware.ts`:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LOCALES = ["en", "vi"] as const;
const DEFAULT_LOCALE = "en";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static files (favicon, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Check if path already starts with a supported locale
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Redirect to default locale
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
```

- [ ] **Step 9.5: Create locale JSON stubs**

```bash
mkdir -p "/Users/anhnguyen/Obsidian/Business planning/apps/website/locales/en"
mkdir -p "/Users/anhnguyen/Obsidian/Business planning/apps/website/locales/vi"
```

`apps/website/locales/en/common.json`:
```json
{
  "nav": {
    "services": "Services",
    "about": "About",
    "contact": "Contact",
    "bookNow": "Book Now"
  },
  "hero": {
    "headline": "One Stop, All Solutions",
    "subheadline": "Tax · Insurance · Immigration · AI",
    "ctaPrimary": "Book Free Consultation",
    "ctaSecondary": "Our Services"
  },
  "services": {
    "tax": { "name": "Tax & Business", "tagline": "Individual & business tax, LLC setup" },
    "insurance": { "name": "Insurance & Finance", "tagline": "Life, annuity, P&C coverage" },
    "immigration": { "name": "Immigration", "tagline": "USCIS document preparation, Texas" },
    "ai": { "name": "AI / Automation", "tagline": "Workflow automation for SMBs" }
  }
}
```

`apps/website/locales/vi/common.json`:
```json
{
  "nav": {
    "services": "Dịch Vụ",
    "about": "Giới Thiệu",
    "contact": "Liên Hệ",
    "bookNow": "Đặt Lịch"
  },
  "hero": {
    "headline": "Một Điểm Đến, Mọi Giải Pháp",
    "subheadline": "Thuế · Bảo Hiểm · Di Trú · AI",
    "ctaPrimary": "Đặt Lịch Miễn Phí",
    "ctaSecondary": "Dịch Vụ Của Chúng Tôi"
  },
  "services": {
    "tax": { "name": "Thuế & Kinh Doanh", "tagline": "Khai thuế cá nhân & doanh nghiệp, LLC" },
    "insurance": { "name": "Bảo Hiểm & Tài Chính", "tagline": "Bảo hiểm nhân thọ, niên kim, tài sản" },
    "immigration": { "name": "Di Trú", "tagline": "Chuẩn bị hồ sơ USCIS, chỉ Texas" },
    "ai": { "name": "Tự Động Hóa AI", "tagline": "Tự động hóa quy trình cho doanh nghiệp nhỏ" }
  }
}
```

- [ ] **Step 9.6: Test bilingual routing**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning/apps/website"
pnpm dev
```

- `http://localhost:3000` → should redirect to `http://localhost:3000/en`
- `http://localhost:3000/en` → renders "MannaOS.com" + "Phase 1A — Coming soon"
- `http://localhost:3000/vi` → renders "MannaOS.com" + "Đang xây dựng…"

No console errors, no 404s. Stop with Ctrl+C.

- [ ] **Step 9.7: Run full pipeline**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm turbo lint type-check
```

Expected: all tasks succeed, 0 errors.

- [ ] **Step 9.8: Commit**

```bash
git add apps/website/app/ apps/website/middleware.ts apps/website/locales/
git commit -m "feat: add [locale] app router structure with EN/VI routing and locale stubs"
```

---

## Task 10: .env.local.example [SCOPE: apps/website]

**Goal:** Document the required environment variables for the Phase 1A build.
**Done when:** `.env.local.example` is committed; `.env.local` is gitignored.

**Files:**
- Create: `apps/website/.env.local.example`
- Create: `apps/website/.env.local` (local only, not committed)

- [ ] **Step 10.1: Create .env.local.example**

`apps/website/.env.local.example`:
```bash
# ─── Supabase ───────────────────────────────────────────────────
# Get from: https://app.supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Resend (email delivery for contact form) ───────────────────
# Get from: https://resend.com → API Keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@mannaos.com
RESEND_TO_EMAIL=Chris@mannaos.com

# ─── Meta Pixel (Phase 1A — Facebook Ads) ───────────────────────
NEXT_PUBLIC_META_PIXEL_ID=your-pixel-id

# ─── Google Analytics 4 ─────────────────────────────────────────
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# ─── Site ────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://mannaos.com
```

- [ ] **Step 10.2: Create .env.local with empty values for local dev**

```bash
cp "/Users/anhnguyen/Obsidian/Business planning/apps/website/.env.local.example" \
   "/Users/anhnguyen/Obsidian/Business planning/apps/website/.env.local"
```

Leave all values empty for now. Phase 1A tasks will fill them in as each service is integrated.

- [ ] **Step 10.3: Verify .env.local is gitignored**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
git status apps/website/.env.local
```

Expected: `.env.local` does NOT appear in git status output (it is gitignored). If it does appear, add `apps/website/.env.local` to `.gitignore`.

- [ ] **Step 10.4: Commit .env.local.example only**

```bash
git add apps/website/.env.local.example
git commit -m "chore: add .env.local.example with Phase 1A required env vars"
```

---

## Task 11: Final Pipeline Verification [SCOPE: ROOT]

**Goal:** Run the full `turbo lint` and `turbo type-check` pipeline from the monorepo root and confirm zero errors across all workspaces.
**Done when:** Both commands exit 0 with no warnings or errors.

- [ ] **Step 11.1: Run lint**

```bash
cd "/Users/anhnguyen/Obsidian/Business planning"
pnpm turbo lint
```

Expected output:
```
Tasks: 1 successful, 1 total
Cached: 0 cached, 1 total
Time: X.XXs
```

If any lint error appears, fix it in `apps/website/` before continuing.

- [ ] **Step 11.2: Run type-check**

```bash
pnpm turbo type-check
```

Expected output:
```
Tasks: 1 successful, 1 total
Cached: 0 cached, 1 total
Time: X.XXs
```

If any TypeScript error appears, fix it before continuing.

- [ ] **Step 11.3: Run build (smoke test)**

```bash
pnpm turbo build
```

Expected: `apps/website` builds successfully. `.next/` folder created inside `apps/website/`. No errors.

---

## Task 12: Update ROADMAP.md [SCOPE: ROOT]

**Action: Cập nhật file `docs/ROADMAP.md`: đổi `[ ]` thành `[x]` cho Phase 1 Static Safety.**

**Done when:** `docs/ROADMAP.md` shows `[x] Phase 1: Static Safety` and the change is committed.

- [ ] **Step 12.1: Edit ROADMAP.md**

Open `docs/ROADMAP.md` and change:
```
- [ ] **Phase 1: Static Safety** - Setup Monorepo workspace, Tech Stack, TypeScript, Linter.
```
to:
```
- [x] **Phase 1: Static Safety** - Setup Monorepo workspace, Tech Stack, TypeScript, Linter.
```

- [ ] **Step 12.2: Commit the ROADMAP update**

```bash
git add docs/ROADMAP.md
git commit -m "chore: mark Phase 1 Static Safety as complete in ROADMAP"
```

---

## Self-Review Checklist

| Requirement | Covered by task |
|---|---|
| Turborepo root with pnpm workspaces | Task 1 |
| `packages/tsconfig` shared TypeScript configs | Task 2 |
| `packages/eslint-config` shared ESLint rules | Task 3 |
| Prettier configured at root | Task 4 |
| Next.js 14 App Router bootstrapped in `apps/website` | Task 5 |
| `apps/website` extends `@mannaos/tsconfig` | Task 6 |
| `apps/website` extends `@mannaos/eslint-config` | Task 7 |
| Tailwind dark navy tokens from PRD §7 | Task 8 |
| `[locale]` routing (EN default, VI supported) | Task 9 |
| `.env.local.example` with Phase 1A vars | Task 10 |
| `turbo lint` + `turbo type-check` both pass from root | Task 11 |
| ROADMAP.md updated to [x] Phase 1 | Task 12 |
| No Next.js deps installed at ROOT scope | Enforced by scope rules |
| No feature code written (Phase 1A code starts next plan) | All tasks are infra/config only |

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-phase1-static-safety.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration
- Use `superpowers:subagent-driven-development`

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints
- Use `superpowers:executing-plans`
