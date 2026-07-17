# N400 PageHero Consistency + Việt hóa Greeting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thống nhất container `max-w-6xl` cho 4 trang hub, đưa hero Thi thử về hero recipe chuẩn (Card trắng + ảnh tràn mép phải + eyebrow badge), Việt hóa greeting header, sửa chip thời gian khỏi giống button.

**Architecture:** Recipe-only (spec đã duyệt: `docs/superpowers/specs/2026-07-16-n400-pagehero-design.md`) — không tạo component mới, sửa tại chỗ 3 file. Mỗi concern một commit atomic.

**Tech Stack:** Next.js (apps/website), Tailwind, Vitest. Test: `pnpm --filter website test` (baseline hiện tại trên main: **351 test / 38 file**). Typecheck: `pnpm --filter website exec tsc --noEmit`.

**Lưu ý chung cho mọi task:** Không có unit test mới (thay đổi style/copy thuần, không logic). Gate = full suite không regression + tsc sạch. KHÔNG sửa gì ngoài phạm vi từng task.

---

### Task 1: Thống nhất container max-w-6xl

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/(app)/dashboard-client.tsx:232`
- Modify: `apps/website/src/app/[locale]/n400app/(app)/progress/page.tsx:187`

- [ ] **Step 1: Sửa dashboard container**

Dòng 232, thay `max-w-[1400px]` bằng `max-w-6xl` (giữ nguyên mọi class khác):

```tsx
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-3 lg:short:space-y-2 xl:tall:space-y-5">
```

- [ ] **Step 2: Sửa progress container**

Dòng 187, thay `max-w-[900px]` bằng `max-w-6xl`:

```tsx
    <div className="mx-auto flex max-w-6xl flex-col gap-2 animate-in fade-in duration-300 sm:gap-4">
```

- [ ] **Step 3: Verify**

Run: `cd apps/website && grep -rn "max-w-\[900px\]\|max-w-\[1400px\]" src/app` → expected: không còn kết quả.
Run: `pnpm --filter website test` → expected 351 pass. `pnpm --filter website exec tsc --noEmit` → sạch.

- [ ] **Step 4: Commit**

```bash
git add "apps/website/src/app/[locale]/n400app/(app)/dashboard-client.tsx" "apps/website/src/app/[locale]/n400app/(app)/progress/page.tsx"
git commit -m "fix(n400): unify hub page containers at max-w-6xl"
```

---

### Task 2: Hero Thi thử về recipe chuẩn

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/(app)/mock-test/page.tsx` (imports ~dòng 9–21, hero section ~dòng 106–163)

- [ ] **Step 1: Thêm import Card**

Sau block import lucide-react (~dòng 21), thêm:

```ts
import { Card } from '@/components/n400/ui';
```

- [ ] **Step 2: Thay toàn bộ hero section**

Thay nguyên khối từ `{/* Hero banner */}` + `<section ...>` (dòng ~106) đến `</section>` đóng tương ứng (dòng ~163) bằng:

```tsx
      {/* Hero banner — khung theo hero recipe chuẩn (docs/superpowers/specs/2026-07-16-n400-pagehero-design.md) */}
      <Card className="relative shrink-0 !overflow-hidden !p-0 border-slate-200/60">
        {/* Ảnh phủ mép phải + gradient blend trái — same recipe as ReadinessHero */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <Image
            src={`${THUMB_DIR}/Hero bar thumbnail.png`}
            alt=""
            fill
            sizes="(min-width: 1024px) 44vw, 0px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent" />
        </div>

        <div className="relative z-[1] p-[clamp(1rem,2.5vh,1.5rem)] lg:w-[56%]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 shadow-sm">
            <Star size={12} className="text-amber-400" fill="currentColor" />
            Thi như thật
          </span>
          <h2 className="mt-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(1.25rem,3vh,1.5rem)] font-extrabold leading-tight text-gray-900">
            Thi thử như phỏng vấn thật!
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-600">
            Mô phỏng đầy đủ kỳ thi quốc tịch Mỹ với câu hỏi ngẫu nhiên, thời gian thực và tiêu
            chuẩn chấm điểm như USCIS.
          </p>

          <div className="mt-[clamp(0.5rem,1.5vh,1rem)] grid grid-cols-2 gap-x-3 gap-y-2 xl:grid-cols-4">
            {HERO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-white text-teal-600 shadow-sm">
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-semibold leading-snug text-gray-700">
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-[clamp(0.75rem,2vh,1rem)] flex flex-wrap items-center gap-3">
            <Link
              href={`${base}/full`}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700"
            >
              Bắt đầu thi thử đầy đủ
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Clock size={14} className="text-teal-600" />
              Khoảng 15–18 phút
            </span>
          </div>
        </div>
      </Card>
```

Những gì thay đổi so với bản cũ (để reviewer đối chiếu): khung section gradient teal → Card trắng recipe; ảnh từ khung inset `lg:w-[42%] rounded-2xl` + alt mô tả → phủ absolute `w-[44%]` + gradient blend + `alt=""` decorative + `priority` (thay prop `preload` cũ); thêm eyebrow badge "Thi như thật"; chip thời gian bỏ `rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm`, đổi `text-gray-600` → `text-gray-500`. Title/subtitle/4 chips/CTA giữ nguyên nội dung và clamp spacing. KHÔNG đụng section "Chọn bài thi phù hợp với bạn" phía dưới.

- [ ] **Step 3: Verify**

Run: `pnpm --filter website exec tsc --noEmit` → sạch (không còn dùng biến nào thừa; `Star` đã được import sẵn).
Run: `pnpm --filter website test` → 351 pass.
Run: `grep -n "from-teal-50 via-white to-sky-50\|lg:w-\[42%\]\|preload" "apps/website/src/app/[locale]/n400app/(app)/mock-test/page.tsx"` → expected: không còn kết quả.

- [ ] **Step 4: Commit**

```bash
git add "apps/website/src/app/[locale]/n400app/(app)/mock-test/page.tsx"
git commit -m "fix(n400): align mock test hero with the standard hero recipe"
```

---

### Task 3: Việt hóa greeting header

**Files:**
- Modify: `apps/website/src/components/n400/Header.tsx:123-127`

- [ ] **Step 1: Sửa greeting + subtitle**

Thay:

```ts
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    meta = {
      title: `${greeting}, ${getShortName(profile)}! 👋`,
      subtitle: 'Ready to continue your citizenship journey?',
    };
```

bằng:

```ts
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    meta = {
      title: `${greeting}, ${getShortName(profile)}! 👋`,
      subtitle: 'Sẵn sàng tiếp tục hành trình chinh phục quốc tịch Mỹ chưa?',
    };
```

Không đổi logic giờ, không đổi gì khác trong file.

- [ ] **Step 2: Verify**

Run: `pnpm --filter website test` → 351 pass. `grep -rn "Good morning\|Good evening\|citizenship journey" apps/website/src` → không còn kết quả.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/n400/Header.tsx
git commit -m "fix(n400): localize dashboard greeting to Vietnamese"
```

---

### Task 4 (controller tự làm, không dispatch subagent): Visual verification

- [ ] Chạy app + screenshot 4 trang (Tổng quan / Học tập / Thi thử / Tiến độ) theo recipe trong memory `n400-visual-verification-recipe`.
- [ ] Check: 4 hero cùng bề ngang; hero Thi thử khung trắng + ảnh tràn mép + badge; trang Thi thử KHÔNG scroll ở desktop; torch dashboard vẫn overflow đúng recipe --pop; greeting tiếng Việt.
- [ ] Nếu trang Thi thử bị tràn scroll do badge thêm chiều cao: giảm `p-[clamp(...)]` của content xuống mức cũ hoặc giảm `gap` — sửa nhỏ, commit fixup vào Task 2.

## Verification cuối
- [ ] `pnpm --filter website test` → 351 pass; `tsc --noEmit` sạch.
- [ ] Grep tổng: `grep -rn "max-w-\[900px\]\|max-w-\[1400px\]\|Good evening\|citizenship journey\|from-teal-50 via-white to-sky-50" apps/website/src` → 0 kết quả.
