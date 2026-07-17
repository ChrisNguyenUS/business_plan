# Đợt 1 — Move n400app → `/n400ready` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App đổi URL từ `/{en|vi}/n400app/*` sang `/n400ready/*` (không locale segment), link cũ redirect 308, hành vi app giữ nguyên 100% (vẫn tiếng Việt).

**Architecture:** Di chuyển nguyên cây route `src/app/[locale]/n400app/` ra `src/app/n400ready/`; middleware bỏ qua ép-locale cho `/n400ready`, thêm redirect legacy + case-insensitive; sweep toàn bộ tham chiếu path trong 47 file về `/n400ready` (không còn `${locale}`). Spec: `docs/superpowers/specs/2026-07-17-n400ready-url-i18n-design.md`.

**Tech Stack:** Next.js App Router (đọc `node_modules/next/dist/docs/` khi cần — repo dặn API có thể khác training data), vitest, Playwright, Supabase SSR middleware.

**Working directory:** `apps/website` (mọi lệnh chạy từ đây). Làm trên nhánh mới `feat/n400ready-url` từ `main`.

**Lưu ý pre-existing:** `src/middleware.ts:45-48` có block `TEMP-PREVIEW-BYPASS` ghi "remove before commit" — có sẵn trên main, KHÔNG thuộc scope này, giữ nguyên (chỉ đổi regex nó dùng).

---

### Task 1: Cập nhật tests trước (RED)

3 file test đọc source theo path + e2e smoke. Đổi expectations sang path mới — chúng sẽ đỏ cho tới khi move + sweep xong.

**Files:**
- Modify: `src/components/n400/navigation-ia.test.ts`
- Modify: `src/components/n400/mobile-layout.test.ts`
- Modify: `src/components/n400/entrypoint-branding.test.ts`
- Modify: `e2e/n400/smoke.spec.ts`

- [ ] **Step 1: Đổi mọi path source trong 3 file vitest**

```bash
sed -i '' "s|src/app/\[locale\]/n400app/|src/app/n400ready/|g" \
  src/components/n400/navigation-ia.test.ts \
  src/components/n400/mobile-layout.test.ts \
  src/components/n400/entrypoint-branding.test.ts
```

- [ ] **Step 2: Đổi expectations href trong `entrypoint-branding.test.ts`**

Dòng 16 và 23 hiện là:

```ts
expect(navbar).toContain('href: `/${locale}/n400app`');
expect(hero).toContain('href={`/${locale}/n400app`}');
```

Sửa thành (khớp code mới ở Task 4):

```ts
expect(navbar).toContain('href: "/n400ready"');
expect(hero).toContain('href="/n400ready"');
```

- [ ] **Step 3: Đổi URL trong e2e smoke**

```bash
sed -i '' "s|/vi/n400app|/n400ready|g" e2e/n400/smoke.spec.ts
```

- [ ] **Step 4: Chạy để xác nhận RED đúng lý do**

Run: `npx vitest run src/components/n400`
Expected: FAIL — các test `source(...)` báo không đọc được file `src/app/n400ready/...` (ENOENT). Nếu fail vì lý do khác, dừng và xem lại.

(Không commit ở đây — commit atomic cùng phần move ở Task 7, vì repo không thể xanh giữa chừng.)

---

### Task 2: Move cây route

**Files:**
- Move: `src/app/[locale]/n400app/` → `src/app/n400ready/` (giữ nguyên cấu trúc con, gồm `(app)`, `(auth)`, `layout.tsx`)

- [ ] **Step 1: git mv**

```bash
git mv "src/app/[locale]/n400app" "src/app/n400ready"
```

- [ ] **Step 2: Xác nhận không còn import gãy do move**

Imports trong cây đều dùng alias `@/...` hoặc relative nội bộ nên move nguyên cây không gãy. Kiểm chứng:

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: CÓ lỗi nhưng chỉ liên quan `params.locale` / biến `locale` (sẽ xử lý ở Task 4-5), KHÔNG có lỗi "Cannot find module".

---

> **Addendum (phát hiện khi thi công):** `src/app/[locale]/layout.tsx` là root layout duy nhất (`<html>/<body>` + `AuthProvider` + analytics). Sau khi move, `src/app/n400ready/layout.tsx` PHẢI trở thành root layout riêng của segment (shell + `AuthProvider` bọc `N400UserStateProvider` + GA/MetaPixel/Analytics/SpeedInsights, `<html lang="vi">`), nếu không mọi trang `/n400ready/*` sẽ 500 (`useAuth must be used within AuthProvider`). Đã xử lý trong lúc thực thi Task 6+7.

### Task 3: Middleware — skip locale, legacy redirect, case-insensitive, guard mới

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Đổi khối hằng số regex (dòng 5-15)**

Cũ:

```ts
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;
const N400_RE = /^\/[a-z]{2}\/n400app(\/|$)/;
// Auth pages inside /n400app that must be accessible without a session.
const N400_PUBLIC_RE = /^\/[a-z]{2}\/n400app\/login(\/|$)/;
// Routes that signed-in users can hit before completing /setup. /setup itself
// would loop without this exemption; /help is informational and can render
// without a profile row.
const N400_NO_PROFILE_GATE_RE = /^\/[a-z]{2}\/n400app\/(setup|help|login)(\/|$)/;
```

Mới:

```ts
const ADMIN_RE = /^\/[a-z]{2}\/admin(\/|$)/;
const PORTAL_RE = /^\/[a-z]{2}\/portal(\/|$)/;
// N400 app lives at /n400ready — no locale segment (language is cookie-based).
const N400_RE = /^\/n400ready(\/|$)/;
// Auth pages inside /n400ready that must be accessible without a session.
const N400_PUBLIC_RE = /^\/n400ready\/login(\/|$)/;
// Routes that signed-in users can hit before completing /setup. /setup itself
// would loop without this exemption; /help is informational and can render
// without a profile row.
const N400_NO_PROFILE_GATE_RE = /^\/n400ready\/(setup|help|login)(\/|$)/;
// Old bookmarked URLs from the /{locale}/n400app era.
const N400_LEGACY_RE = /^\/(?:en|vi)\/n400app(\/.*)?$/;
```

- [ ] **Step 2: Chèn redirect legacy + case-normalize NGAY SAU khối skip (sau dòng `return NextResponse.next();` của SKIP, trước "Step 1: i18n")**

```ts
  // ── N400 URL canonicalization ──
  // Legacy /{en|vi}/n400app/* bookmarks → /n400ready/* (permanent).
  const legacyMatch = pathname.match(N400_LEGACY_RE);
  if (legacyMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/n400ready${legacyMatch[1] ?? ''}`;
    return NextResponse.redirect(url, 308);
  }
  // /N400Ready (any casing) → /n400ready, preserving the rest of the path.
  const firstSegment = pathname.split('/')[1];
  if (firstSegment && firstSegment !== 'n400ready' && firstSegment.toLowerCase() === 'n400ready') {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(firstSegment, 'n400ready');
    return NextResponse.redirect(url, 308);
  }
```

- [ ] **Step 3: Bỏ qua `/n400ready` ở bước ép locale-prefix**

Trong khối `if (!pathnameHasLocale) {` (dòng ~32), thêm điều kiện: chỉ redirect khi KHÔNG phải path n400. Sửa điều kiện thành:

```ts
  if (!pathnameHasLocale && !N400_RE.test(pathname)) {
```

- [ ] **Step 4: Sửa các redirect trong guard N400 — bỏ `${locale}`**

Ba chỗ (dòng cũ 93, 118, 130):

```ts
return NextResponse.redirect(new URL(`/${locale}/n400app/login`, request.url));
// ... 
return NextResponse.redirect(new URL(`/${locale}/n400app/setup`, request.url));
```

thành:

```ts
return NextResponse.redirect(new URL('/n400ready/login', request.url));
// ...
return NextResponse.redirect(new URL('/n400ready/setup', request.url));
```

Lưu ý dòng `const locale = pathname.split('/')[1];` (cũ 65): với path `/n400ready/*` biến này sẽ là chuỗi `'n400ready'` — SAI nếu dùng. Sau sửa, `locale` chỉ còn dùng cho nhánh admin/portal (path có locale thật) — giữ nguyên dòng đó, nhưng xác nhận không nhánh N400 nào còn tham chiếu `locale`.

- [ ] **Step 5: Type-check middleware**

Run: `npx tsc --noEmit 2>&1 | grep middleware`
Expected: không có lỗi.

---

### Task 4: Sweep path trong app + entry points

**Files (nhóm sed hàng loạt):** toàn bộ `.ts/.tsx` dưới `src/app/n400ready/`, `src/components/n400/` (trừ 3 file test đã sửa), `src/lib/n400/`
**Files (sửa tay):**
- Modify: `src/components/layout/Navbar.tsx:34`
- Modify: `src/components/home/HeroSection.tsx`
- Modify: `src/components/layout/ConditionalChrome.tsx:6`
- Modify: `src/components/providers/AuthProvider.tsx:130`
- Modify: `src/app/api/auth/callback/route.ts:61-63`
- Modify: `src/app/n400ready/(auth)/login/page.tsx`

- [ ] **Step 1: Sed hàng loạt — pattern có locale trước, pattern trần sau**

```bash
FILES=$(grep -rl 'n400app' src/app/n400ready src/components/n400 src/lib/n400 --include='*.ts' --include='*.tsx' | grep -v '.test.ts')
# 1. `/${locale}/n400app` → `/n400ready` (template literals)
perl -pi -e 's{/\$\{locale\}/n400app}{/n400ready}g' $FILES
# 2. Path trần còn lại `/n400app` → `/n400ready`
perl -pi -e 's{/n400app}{/n400ready}g' $FILES
# 3. Comment/nhãn còn nhắc "n400app base" → cập nhật chữ
perl -pi -e 's{n400app}{n400ready}g' $FILES
```

Sau bước này nhiều template literal thành `` `/n400ready` `` không còn `${}` — để nguyên dạng backtick cũng chạy, nhưng lint có thể báo; Task 5 dọn.

- [ ] **Step 2: Navbar — href tĩnh**

`src/components/layout/Navbar.tsx:34` cũ:

```ts
{ label: "N400 Ready", href: `/${locale}/n400app` },
```

mới (khớp expectation test Task 1):

```ts
{ label: "N400 Ready", href: "/n400ready" },
```

- [ ] **Step 3: HeroSection — href tĩnh**

Trong `src/components/home/HeroSection.tsx`, thay `href={`/${locale}/n400app`}` bằng:

```tsx
href="/n400ready"
```

- [ ] **Step 4: ConditionalChrome regex**

`src/components/layout/ConditionalChrome.tsx:6` cũ `const N400_RE = /^\/[a-z]{2}\/n400app(\/|$)/;` mới:

```ts
const N400_RE = /^\/n400ready(\/|$)/;
```

- [ ] **Step 5: AuthProvider + auth callback default**

`src/components/providers/AuthProvider.tsx:130`:

```ts
redirectTo: `${window.location.origin}/api/auth/callback?next=/n400ready`,
```

`src/app/api/auth/callback/route.ts:61-63`:

```ts
const next = searchParams.get('next') ?? '/n400ready';
// ...
const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/n400ready';
```

- [ ] **Step 6: Login page — link sang trang marketing giữ locale tĩnh `vi`**

`src/app/n400ready/(auth)/login/page.tsx`: trang này không còn `params.locale`. Đợt 1 app mặc định tiếng Việt nên 2 link marketing trỏ cứng `vi` (Đợt 2 sẽ đổi theo cookie):

```tsx
<Link href="/vi/forgot-password" className={styles.link}>
// ...
<Link href="/vi/signup" className={styles.linkBold}>
```

và redirect sau login (cũ `window.location.href = `/${locale}/n400app``):

```ts
window.location.href = '/n400ready';
```

Xoá dòng `const locale = (params?.locale as string) || 'vi';` khi không còn chỗ dùng.

- [ ] **Step 7: Grep về 0**

Run: `grep -rn "n400app" src e2e --include='*.ts' --include='*.tsx' | grep -v "src/middleware.ts"`
Expected: 0 kết quả (middleware được phép giữ chữ `n400app` trong regex/comment legacy). Còn dòng nào → sửa nốt thủ công theo cùng quy tắc (path → `/n400ready`, bỏ `${locale}`).

---

### Task 5: Dọn biến `locale` mồ côi

**Files:** các file vừa sweep còn khai báo `locale`/`params` không dùng (type-check/lint chỉ điểm chính xác).

- [ ] **Step 1: Liệt kê lỗi**

Run: `npx tsc --noEmit 2>&1 | head -40` và `npx eslint src/app/n400ready src/components/n400 src/components/layout src/components/home src/components/providers src/lib/n400 2>&1 | head -60`

- [ ] **Step 2: Với từng file báo lỗi:** xoá `const locale = ...`, xoá `useParams`/`params` import + prop nếu không còn chỗ dùng khác. KHÔNG xoá gì ngoài phần liên quan locale. Ví dụ mẫu (Sidebar.tsx dòng 91):

```ts
// cũ
const base = `/${locale}/n400app`;
// sau sed đã thành `/n400ready`; đổi backtick thành string thường và xoá locale phía trên:
const base = '/n400ready';
```

- [ ] **Step 3: Chạy lại cho sạch**

Run: `npx tsc --noEmit && npx eslint src`
Expected: exit 0.

---

### Task 6: Vitest GREEN

- [ ] **Step 1:** Run: `npx vitest run`
Expected: PASS toàn bộ (3 file test source-reading xanh lại; các suite khác không đổi). Test nào đỏ → sửa code/test theo đúng spec, không skip.

---

### Task 7: Smoke redirect bằng dev server + commit

- [ ] **Step 1: Chạy dev server nền rồi curl kiểm các hành vi redirect**

```bash
npx next dev -p 3100 &  # đợi "Ready"
curl -sI http://localhost:3100/en/n400app/practice | grep -i "^HTTP\|^location"
# Expected: 308, location: /n400ready/practice
curl -sI http://localhost:3100/vi/n400app | grep -i "^HTTP\|^location"
# Expected: 308, location: /n400ready
curl -sI http://localhost:3100/N400Ready/login | grep -i "^HTTP\|^location"
# Expected: 308, location: /n400ready/login
curl -sI http://localhost:3100/n400ready/login | grep -i "^HTTP"
# Expected: 200 (login là public, không redirect)
curl -sI http://localhost:3100/n400ready/practice | grep -i "^HTTP\|^location"
# Expected: dev có TEMP-PREVIEW-BYPASS nên 200; đây là hành vi dev-only có sẵn.
curl -sI http://localhost:3100/vi/about | grep -i "^HTTP"
# Expected: 200 — website marketing không bị ảnh hưởng.
```

Tắt server sau khi xong.

- [ ] **Step 2: Build production để chắc route compile**

Run: `npx next build 2>&1 | tail -15`
Expected: build thành công, route list có `/n400ready/...`, không còn `/[locale]/n400app`.

- [ ] **Step 3: Commit atomic duy nhất**

```bash
git add -A
git commit -m "feat(n400): move app to /n400ready, drop locale segment

Legacy /{en,vi}/n400app/* 308-redirect to /n400ready/*. Case-insensitive
/N400Ready normalizes to lowercase. Middleware guards, auth callback,
navbar/hero entry points, and source-reading tests updated.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Cập nhật roadmap nếu có mục tương ứng**

Kiểm `docs/ROADMAP.md` (repo root) — nếu có dòng cho việc này thì tick `[x]`; không có thì bỏ qua, KHÔNG tự thêm mục mới.

---

## Definition of Done (Đợt 1)

- `grep -rn "n400app" src e2e` chỉ còn khớp regex/comment legacy trong `src/middleware.ts`.
- `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build` đều pass.
- Toàn bộ lệnh curl ở Task 7 đúng expected.
- Đúng MỘT commit feature (atomic). Không đổi hành vi/ngôn ngữ UI nào khác.
