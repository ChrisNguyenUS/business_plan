# N400 CTA Verb System Normalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa toàn bộ CTA button label trong app N400 theo một verb system thống nhất, xoá tình trạng "Bắt đầu ngay / Học ngay / Luyện ngay / Tiếp tục học" dùng lẫn lộn giữa các màn.

**Architecture:** String-level + logic-level normalization, không đổi route/href nào. Ba điểm sửa: (1) `study-modules.ts` — CTA label suy ra từ *state* của module thay vì từ badge/recommended, (2) `hero-recommendation.ts` — hero CTA dùng đúng verb chuẩn, (3) `mock-test/page.tsx` — mọi card thi thử dùng chung "Bắt đầu". Mỗi điểm sửa là một commit atomic.

**Tech Stack:** Next.js (apps/website), TypeScript, Vitest. Test chạy bằng `pnpm --filter website test` từ repo root (hoặc `pnpm test` trong `apps/website`).

---

## Verb System (spec — nguồn chân lý cho mọi CTA)

| Loại hành động | Label | Điều kiện |
|---|---|---|
| Học module chưa bắt đầu | `Học ngay` | `done === 0` |
| Học module đang dở | `Tiếp tục học` | `done > 0` và chưa complete |
| Module yếu cần luyện | `Luyện ngay` | needs-practice (accuracy < 70%, ≥ 3 graded attempts) |
| Module đã hoàn thành | `Ôn luyện lại` | complete |
| Thi thử (mọi card trong grid) | `Bắt đầu` | luôn luôn — badge "ĐỀ XUẤT" tự phân biệt card đề xuất, không đổi label |
| Gợi ý luyện tập contextual | `Luyện ngay` | giữ nguyên (đã đúng) |

**Quy tắc hero:** Hero được phép dùng CTA mô tả (vd. "Bắt đầu thi thử đầy đủ", "Ôn lại câu sai", "Tiếp tục học Civics") nhưng khi hero dùng verb học tập thì phải trùng verb chuẩn — không có biến thể "… ngay" dán thêm ("Tiếp tục học ngay" → "Tiếp tục học").

**Các label giữ nguyên (đã đúng hệ thống, KHÔNG sửa):**
- `dashboard-client.tsx` — "Luyện ngay" (4 chỗ): gợi ý luyện tập contextual ✓
- `hub/HubCards.tsx:247` — "Luyện ngay" ✓
- `hub/PracticeSelector.tsx:307` — "Bắt đầu luyện tập": nút launch của practice hub, descriptive ✓
- `progress/page.tsx:123` — `known > 0 ? 'Tiếp tục học' : 'Học ngay'`: đã state-driven ✓
- `readiness.ts:253–288` — "Học Civics", "Luyện What Mean", "Thi thử Viết"…: CTA theo tiêu chí, descriptive có chủ đích ✓
- `mock-test/full/page.tsx` — "Bắt đầu Full Interview": hero/start screen, descriptive ✓
- `mock-test/civics/page.tsx:533` — "Bắt đầu thi thử (mới)": result screen, descriptive ✓
- `hero-recommendation.ts:191` — "Ôn lại câu sai", `:256` — "Ôn lại ngay", `:61` — "Tiếp tục học Civics": hero descriptive ✓

---

### Task 1: `study-modules.ts` — CTA label suy từ state, không phụ thuộc badge

Hiện tại `decideModuleBadge` trả label sai hệ thống: badge `continue` (đang học dở) lại ra "Học ngay", badge `needs-practice` ra "Học ngay", còn recommended chưa-bắt-đầu ra "Luyện ngay". Sửa thành: label chỉ phụ thuộc state; `recommended` chỉ đổi badge, không đổi verb.

**Files:**
- Modify: `apps/website/src/lib/n400/study-modules.ts:39-120`
- Test: `apps/website/src/lib/n400/study-modules.test.ts:57-85`

- [ ] **Step 1: Sửa test cho mapping mới (RED)**

Trong `study-modules.test.ts`, thay 3 assertion trong `describe('decideModuleBadge — exactly one badge per card', ...)`:

```ts
  it('started, healthy accuracy → continue', () => {
    expect(byId('whatmean')).toEqual({ badge: 'continue', ctaLabel: 'Tiếp tục học' });
  });
  it('started, low accuracy → needs-practice', () => {
    expect(byId('yesno')).toEqual({ badge: 'needs-practice', ctaLabel: 'Luyện ngay' });
  });
```

và thay test `'recommended brand-new module uses Luyện ngay'` (dòng 80–82) bằng:

```ts
  it('recommended brand-new module keeps the state verb Học ngay', () => {
    expect(decideModuleBadge(sig('civics', 0, 128), true).ctaLabel).toBe('Học ngay');
  });
```

Giữ nguyên các test còn lại (`recommended → Tiếp tục học`, `completed → Ôn luyện lại`, `new → Học ngay`, threshold test).

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter website test -- src/lib/n400/study-modules.test.ts`
Expected: FAIL — 3 test mới fail vì code cũ trả 'Học ngay'/'Luyện ngay' theo mapping cũ.

- [ ] **Step 3: Implement mapping mới**

Trong `study-modules.ts`, thay toàn bộ `decideModuleBadge` (dòng 91–120) và doc comment của `ctaLabel` (dòng 41):

```ts
export interface StudyModuleDecision {
  badge: StudyBadgeKind;
  /** Verb chuẩn theo state: Học ngay | Tiếp tục học | Luyện ngay | Ôn luyện lại. */
  ctaLabel: string;
}
```

```ts
type StudyStateBadge = Exclude<StudyBadgeKind, 'recommended'>;

// CTA verb theo state của module — badge "recommended" không đổi verb,
// chỉ đổi khung/⭐ trên card.
const CTA_BY_STATE: Record<StudyStateBadge, string> = {
  completed: 'Ôn luyện lại',
  new: 'Học ngay',
  'needs-practice': 'Luyện ngay',
  continue: 'Tiếp tục học',
};

function decideStateBadge(sig: StudyModuleSignal): StudyStateBadge {
  if (isComplete(sig)) return 'completed';
  if (sig.done === 0) return 'new';

  const acc = moduleAccuracy(sig);
  if (
    acc !== null &&
    sig.gradedAttempts >= NEEDS_PRACTICE_MIN_ATTEMPTS &&
    acc < NEEDS_PRACTICE_MAX_ACCURACY
  ) {
    return 'needs-practice';
  }
  return 'continue';
}

/** The single badge + CTA for one card. Order encodes badge priority. */
export function decideModuleBadge(
  sig: StudyModuleSignal,
  isRecommended: boolean,
): StudyModuleDecision {
  const state = decideStateBadge(sig);
  return {
    badge: isRecommended ? 'recommended' : state,
    ctaLabel: CTA_BY_STATE[state],
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter website test -- src/lib/n400/study-modules.test.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Chạy full suite website để bắt regression (study page render dùng ctaLabel)**

Run: `pnpm --filter website test`
Expected: PASS. Nếu có test khác assert label cũ ('Học ngay' cho continue…), sửa assertion theo verb system.

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/lib/n400/study-modules.ts apps/website/src/lib/n400/study-modules.test.ts
git commit -m "fix(n400): derive study module CTA verb from state, not badge"
```

---

### Task 2: `hero-recommendation.ts` — hero dùng đúng verb chuẩn

Ba label có đuôi "ngay" dán thêm vào verb chuẩn. Không có test nào assert các label này (`hero-recommendation.test.ts` chỉ check `title`), nên đây là string-only edit.

**Files:**
- Modify: `apps/website/src/lib/n400/hero-recommendation.ts:177,244,265`

- [ ] **Step 1: Sửa 3 label**

Dòng 177 (intent `start_civics`):

```ts
      cta: { label: 'Học ngay', href: '/flashcards?filter=unknown' },
```

Dòng 244 (intent `finish_civics`):

```ts
      cta: { label: 'Tiếp tục học', href: '/flashcards?filter=unknown' },
```

Dòng 265 (intent `continue_civics`, nhánh default):

```ts
    cta: { label: 'Tiếp tục học', href: '/flashcards?filter=unknown' },
```

Không đổi href. Không đụng dòng 191 ("Ôn lại câu sai"), 256 ("Ôn lại ngay"), 61 ("Tiếp tục học Civics") — hero descriptive hợp lệ.

- [ ] **Step 2: Chạy test liên quan**

Run: `pnpm --filter website test -- src/lib/n400/hero-recommendation.test.ts`
Expected: PASS (không có assertion label).

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/n400/hero-recommendation.ts
git commit -m "fix(n400): hero CTAs reuse standard learning verbs"
```

---

### Task 3: `mock-test/page.tsx` — mọi card thi thử dùng chung "Bắt đầu"

Card Full Interview đang là "Bắt đầu ngay" chỉ vì được đề xuất — badge "ĐỀ XUẤT" đã làm việc đó. Vì cả 4 card giờ cùng label, xoá luôn field `buttonLabel` khỏi `TestCard` (DRY).

**Files:**
- Modify: `apps/website/src/app/[locale]/n400app/(app)/mock-test/page.tsx:40,54,66,77,88,212`

- [ ] **Step 1: Xoá field khỏi interface**

Trong `interface TestCard` (dòng 32–43), xoá dòng:

```ts
  buttonLabel: string;
```

- [ ] **Step 2: Xoá 4 dòng `buttonLabel` khỏi mảng `TESTS`**

Xoá `buttonLabel: 'Bắt đầu ngay',` (dòng 54) và 3 dòng `buttonLabel: 'Bắt đầu',` (dòng 66, 77, 88). Giữ nguyên `buttonClass` — per-subject accent là chủ đích (PRACTICE_ACCENTS).

- [ ] **Step 3: Hardcode label trong render**

Dòng 212, thay:

```tsx
                {t.buttonLabel}
```

bằng:

```tsx
                Bắt đầu
```

- [ ] **Step 4: Typecheck + test**

Run: `pnpm --filter website exec tsc --noEmit`
Expected: PASS, không còn reference tới `buttonLabel`.

Run: `pnpm --filter website test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/website/src/app/[locale]/n400app/(app)/mock-test/page.tsx"
git commit -m "fix(n400): unify mock test card CTA to Bắt đầu, drop per-card label"
```

---

## Verification cuối (sau cả 3 task)

- [ ] `pnpm --filter website test` — toàn bộ suite PASS.
- [ ] Soát lại bằng grep — không còn biến thể lệch hệ thống trong UI code:

```bash
cd apps/website/src && grep -rn "Bắt đầu ngay\|Tiếp tục học ngay\|Bắt đầu học ngay" app components lib
```

Expected: không còn kết quả nào (ngoài file test nếu có mô tả cũ).

> **Phát sinh khi thực thi (2026-07-16):** final review phát hiện `statistic/page.tsx:149` có "Bắt đầu học ngay" (pre-existing, sót khỏi audit) — đã sửa thành "Học ngay" ở commit thứ 4. Cả 4 commit nằm trên branch `fix/n400-cta-verb-system`.

## Ngoài phạm vi plan này (đã ghi nhận, làm sau)

- Thống nhất max-width container giữa 4 trang.
- Chuẩn hóa khung `PageHero` (lấy geometry đã duyệt của hero dashboard làm chuẩn).
- Chốt luật filled-accent vs tinted-accent cho card grid (Thi thử filled vs Tiến độ tinted).
- Việt hóa greeting header + sửa chip "Khoảng 15–18 phút" khỏi giống button.
