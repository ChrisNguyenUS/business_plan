# Services Content Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable service card summaries and service detail intros for all four services in the website admin Content Editor.

**Architecture:** Keep the existing `site_content(section, content jsonb)` table. Store new values under `section = "services"` as `service_content[service].card_summary.description[locale]` and `service_content[service].detail_intro.description[locale]`. Public pages read through `getDictionary(locale)` so homepage cards, `/services` cards, and service detail pages all use the same content resolution path.

**Tech Stack:** Next.js 16 App Router, React client admin page, Supabase `site_content`, TypeScript, pnpm.

---

## File Map

- Create `apps/website/src/lib/services/service-content.ts`
  - Pure helper types and functions for resolving card summaries and detail intros with fallbacks.
- Modify `apps/website/src/lib/i18n/get-dictionary.ts`
  - Add `service_content` typing and map resolved values into existing dictionary keys.
- Modify `apps/website/src/app/[locale]/admin/content/page.tsx`
  - Add Services tab panels for `Card Summary (Homepage + Services Page)` and `Service Detail Intro`.
- Modify `apps/website/src/app/[locale]/services/immigration/page.tsx`
  - Use localized `d.immigration_desc` instead of hard-coded intro copy.
- Verify existing readers:
  - `apps/website/src/components/home/ServicesOverview.tsx` already reads `services_*_desc`.
  - `apps/website/src/app/[locale]/services/page.tsx` already reads `services_*_desc`.
  - `tax`, `insurance`, and `ai` detail pages already read `*_desc`.

## Task 1: Service Content Helper

**Files:**
- Create: `apps/website/src/lib/services/service-content.ts`

- [ ] **Step 1: Write helper module**

Create a pure helper with these exports:

```ts
export type ServiceSlug = "tax" | "insurance" | "immigration" | "ai";
export type ServiceLocale = "en" | "vi";

export type ServiceContent = Partial<Record<ServiceSlug, {
  card_summary?: { description?: Partial<Record<ServiceLocale, string>> };
  detail_intro?: { description?: Partial<Record<ServiceLocale, string>> };
}>>;

export function resolveLocalizedServiceText(
  serviceContent: ServiceContent | undefined,
  service: ServiceSlug,
  group: "card_summary" | "detail_intro",
  locale: ServiceLocale,
  fallback: string
): string {
  const value = serviceContent?.[service]?.[group]?.description?.[locale];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function updateServiceContentDescription(
  serviceContent: ServiceContent | undefined,
  service: ServiceSlug,
  group: "card_summary" | "detail_intro",
  locale: ServiceLocale,
  value: string
): ServiceContent {
  return {
    ...(serviceContent ?? {}),
    [service]: {
      ...(serviceContent?.[service] ?? {}),
      [group]: {
        ...(serviceContent?.[service]?.[group] ?? {}),
        description: {
          ...(serviceContent?.[service]?.[group]?.description ?? {}),
          [locale]: value,
        },
      },
    },
  };
}
```

- [ ] **Step 2: Verify helper with TypeScript**

Run:

```bash
pnpm --filter website exec tsc --noEmit
```

Expected: TypeScript completes without errors from the helper.

## Task 2: Dictionary Resolution

**Files:**
- Modify: `apps/website/src/lib/i18n/get-dictionary.ts`

- [ ] **Step 1: Import helper and add type support**

Add imports:

```ts
import {
  resolveLocalizedServiceText,
  type ServiceContent,
} from "@/lib/services/service-content";
```

Extend `Dictionary` with:

```ts
service_content?: ServiceContent;
```

- [ ] **Step 2: Resolve DB service content**

Inside the existing `row.section === "services"` block, after existing service fallback setup, add:

```ts
if (content.service_content) {
  const serviceContent = content.service_content as ServiceContent;
  dbDict.service_content = serviceContent;

  dbDict.services_tax_desc = resolveLocalizedServiceText(
    serviceContent,
    "tax",
    "card_summary",
    locale,
    dbDict.services_tax_desc
  );
  dbDict.services_insurance_desc = resolveLocalizedServiceText(
    serviceContent,
    "insurance",
    "card_summary",
    locale,
    dbDict.services_insurance_desc
  );
  dbDict.services_immigration_desc = resolveLocalizedServiceText(
    serviceContent,
    "immigration",
    "card_summary",
    locale,
    dbDict.services_immigration_desc
  );
  dbDict.services_ai_desc = resolveLocalizedServiceText(
    serviceContent,
    "ai",
    "card_summary",
    locale,
    dbDict.services_ai_desc
  );

  dbDict.tax_desc = resolveLocalizedServiceText(serviceContent, "tax", "detail_intro", locale, dbDict.tax_desc);
  dbDict.insurance_desc = resolveLocalizedServiceText(serviceContent, "insurance", "detail_intro", locale, dbDict.insurance_desc);
  dbDict.immigration_desc = resolveLocalizedServiceText(serviceContent, "immigration", "detail_intro", locale, dbDict.immigration_desc);
  dbDict.ai_desc = resolveLocalizedServiceText(serviceContent, "ai", "detail_intro", locale, dbDict.ai_desc);
}
```

- [ ] **Step 3: Preserve legacy fallbacks**

Keep existing top-level legacy reads (`content.tax_desc`, `content.insurance_desc`, `content.immigration_desc`, `content.ai_desc`) as fallback behavior after `service_content` resolution.

## Task 3: Admin Services UI

**Files:**
- Modify: `apps/website/src/app/[locale]/admin/content/page.tsx`

- [ ] **Step 1: Import helper and service types**

Add:

```ts
import {
  updateServiceContentDescription,
  type ServiceContent,
  type ServiceLocale,
  type ServiceSlug,
} from "@/lib/services/service-content";
```

- [ ] **Step 2: Add default description constants**

Add service config for four services:

```ts
const SERVICE_CONTENT_CONFIG: Array<{
  slug: ServiceSlug;
  title: string;
  cardSummary: { en: string; vi: string };
  detailIntro: { en: string; vi: string };
}> = [
  {
    slug: "tax",
    title: "Tax & Business",
    cardSummary: {
      en: "Tax preparation, extension filing, LLC setup, and full business registration services.",
      vi: "Khai thuế, gia hạn nộp thuế, thành lập LLC và dịch vụ đăng ký kinh doanh đầy đủ.",
    },
    detailIntro: {
      en: "Professional tax preparation, business registration, and compliance services for individuals and businesses.",
      vi: "Dịch vụ khai thuế, đăng ký kinh doanh và tuân thủ hồ sơ chuyên nghiệp cho cá nhân và doanh nghiệp.",
    },
  },
  {
    slug: "insurance",
    title: "Insurance & Finance",
    cardSummary: {
      en: "Life insurance, annuity, and retirement planning to protect your family's future.",
      vi: "Bảo hiểm nhân thọ, niên kim và lập kế hoạch hưu trí để bảo vệ tương lai gia đình bạn.",
    },
    detailIntro: {
      en: "Protect your family and secure your financial future with our licensed insurance services.",
      vi: "Bảo vệ gia đình và xây dựng tương lai tài chính vững chắc với dịch vụ bảo hiểm có giấy phép.",
    },
  },
  {
    slug: "immigration",
    title: "Immigration",
    cardSummary: {
      en: "N-400 citizenship, green card, visa renewal, and expert immigration consultation.",
      vi: "Quốc tịch N-400, thẻ xanh, gia hạn visa và tư vấn di trú chuyên nghiệp.",
    },
    detailIntro: {
      en: "Professional Vietnamese-language USCIS document preparation and consultation services. Bilingual support to help you navigate your immigration journey with confidence.",
      vi: "Dịch vụ chuẩn bị hồ sơ USCIS và tư vấn di trú bằng tiếng Việt. Hỗ trợ song ngữ để bạn tự tin trong hành trình di trú.",
    },
  },
  {
    slug: "ai",
    title: "AI / Automation",
    cardSummary: {
      en: "Workflow automation, AI tools for small businesses, and digital transformation.",
      vi: "Tự động hóa quy trình, công cụ AI cho doanh nghiệp nhỏ và chuyển đổi số.",
    },
    detailIntro: {
      en: "Workflow automation, AI tools for small businesses, and digital transformation.",
      vi: "Tự động hóa quy trình, công cụ AI cho doanh nghiệp nhỏ và chuyển đổi số.",
    },
  },
];
```

- [ ] **Step 3: Add update helper inside component**

Add:

```ts
const updateServiceDescription = (
  service: ServiceSlug,
  group: "card_summary" | "detail_intro",
  locale: ServiceLocale,
  value: string
) => {
  const next = updateServiceContentDescription(
    content.service_content as ServiceContent | undefined,
    service,
    group,
    locale,
    value
  );
  updateField("service_content", next);
};
```

- [ ] **Step 4: Add ServiceContentFields component**

Add a client component in the same file:

```tsx
function ServiceContentFields({
  service,
  serviceContent,
  onChange,
}: {
  service: (typeof SERVICE_CONTENT_CONFIG)[number];
  serviceContent?: ServiceContent;
  onChange: (
    service: ServiceSlug,
    group: "card_summary" | "detail_intro",
    locale: ServiceLocale,
    value: string
  ) => void;
}) {
  const cardEn = serviceContent?.[service.slug]?.card_summary?.description?.en ?? service.cardSummary.en;
  const cardVi = serviceContent?.[service.slug]?.card_summary?.description?.vi ?? service.cardSummary.vi;
  const introEn = serviceContent?.[service.slug]?.detail_intro?.description?.en ?? service.detailIntro.en;
  const introVi = serviceContent?.[service.slug]?.detail_intro?.description?.vi ?? service.detailIntro.vi;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-charcoal">Card Summary (Homepage + Services Page)</h3>
          <p className="text-xs text-muted-foreground mt-1">Shown in the four service cards on the homepage and /services.</p>
        </div>
        <ContentField label="Description (English)" value={cardEn} onChange={(v) => onChange(service.slug, "card_summary", "en", v)} multiline />
        <ContentField label="Description (Vietnamese)" value={cardVi} onChange={(v) => onChange(service.slug, "card_summary", "vi", v)} multiline />
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-charcoal">Service Detail Intro</h3>
          <p className="text-xs text-muted-foreground mt-1">Shown at the top of this service detail page only.</p>
        </div>
        <ContentField label="Description (English)" value={introEn} onChange={(v) => onChange(service.slug, "detail_intro", "en", v)} multiline />
        <ContentField label="Description (Vietnamese)" value={introVi} onChange={(v) => onChange(service.slug, "detail_intro", "vi", v)} multiline />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render fields in each Services card**

Render `ServiceContentFields` above `What We Offer` for each service card:

```tsx
<ServiceContentFields
  service={SERVICE_CONTENT_CONFIG.find((service) => service.slug === "tax")!}
  serviceContent={content.service_content}
  onChange={updateServiceDescription}
/>
```

Use the matching slug for each service card.

## Task 4: Immigration Detail Page

**Files:**
- Modify: `apps/website/src/app/[locale]/services/immigration/page.tsx`

- [ ] **Step 1: Replace hard-coded intro text**

Replace the hard-coded paragraph with:

```tsx
{d.immigration_desc}
```

Keep the existing title and pricing line.

## Task 5: Verification

**Files:**
- Verify: `apps/website`

- [ ] **Step 1: Run TypeScript**

```bash
pnpm --filter website exec tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2: Run lint**

```bash
pnpm --filter website lint
```

Expected: exit code 0.

- [ ] **Step 3: Run production build**

```bash
pnpm --filter website build
```

Expected: exit code 0.

- [ ] **Step 4: Manual browser verification**

Start the dev server:

```bash
pnpm --filter website dev
```

Check:

- Services tab shows Card Summary and Service Detail Intro for all four services.
- Editing Card Summary affects the data used by homepage service cards and `/services` cards.
- Editing Service Detail Intro affects only the matching detail page intro.

