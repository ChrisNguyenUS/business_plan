# Service Page Intro Editor Design

**Date:** 2026-05-11
**Scope:** `apps/website`
**Status:** Approved for implementation planning

## Goal

Add admin editing for the intro description on all four public service detail pages:

- Tax & Business
- Insurance & Finance
- Immigration
- AI / Automation

This feature edits only the service detail page hero/intro descriptions. Homepage service card copy remains a separate editor feature and is out of scope.

## Source Documents Checked

- `docs/ROADMAP.md`: current website work is in Website Phase 4, with Content Editor already delivered in Website Phase 3.
- `docs/superpowers/specs/2026-04-10-mannaos-website-prd.md`: public service pages and admin-editable `site_content` are part of the website content engine.
- `docs/superpowers/plans/2026-04-09-mannaos-plan3-admin-panel.md`: original admin plan described website content editing through `site_content`.
- `apps/website/supabase/migrations/phase_b_website_tables.sql`: the implemented schema uses `site_content(section text unique, content jsonb)`, not the earlier key-value draft.

## Database Shape

No database migration is needed.

Use the existing `site_content` row:

```txt
section = "services"
content = jsonb object
```

Add this nested object inside `content`. New writes must use this shape:

```json
{
  "service_page_intros": {
    "tax": {
      "description": {
        "en": "Professional tax preparation, business registration, and compliance services for individuals and businesses.",
        "vi": ""
      }
    },
    "insurance": {
      "description": {
        "en": "Protect your family and secure your financial future with our licensed insurance services.",
        "vi": ""
      }
    },
    "immigration": {
      "description": {
        "en": "Professional Vietnamese-language USCIS document preparation and consultation services. Bilingual support to help you navigate your immigration journey with confidence.",
        "vi": ""
      }
    },
    "ai": {
      "description": {
        "en": "Workflow automation, AI tools for small businesses, and digital transformation.",
        "vi": ""
      }
    }
  }
}
```

Reasoning:

- One nested object keeps all service page intro content together instead of scattering many top-level keys.
- Service slugs (`tax`, `insurance`, `immigration`, `ai`) match existing route/service identifiers.
- Language fields are explicit (`en`, `vi`), which avoids ambiguous suffixes and scales if another editable intro field is added later.
- Existing `tax_services`, `tax_offerings`, `immigration_form_bundles`, and pricing keys remain untouched for backward compatibility.
- Do not add new top-level keys such as `tax_desc_en`, `tax_desc_vi`, or `immigration_desc_vi`.
- Legacy top-level keys such as `tax_desc`, `insurance_desc`, `immigration_desc`, and `ai_desc` may remain readable as fallbacks, but the admin editor must write to `service_page_intros`.

## Admin UI

In the Services tab, each service card gets a `Service Page Intro` panel above `What We Offer` and `Pricing`.

Each panel has two textarea fields:

- Description (English)
- Description (Vietnamese)

The panel labels must make the destination clear:

```txt
Service Page Intro
Shown at the top of /services/tax, not on the homepage service card.
```

The save flow continues to use the existing Content Editor save button and `/api/admin/content` endpoint.

## Public Page Behavior

The service detail pages read the intro description from `getDictionary(locale)`.

For each locale:

- If `service_page_intros[service].description[locale]` has text, use it.
- Otherwise fall back to the existing dictionary copy (`tax_desc`, `insurance_desc`, `immigration_desc`, `ai_desc`).

Homepage and `/services` overview cards continue to use their current `services_*_desc` dictionary fields and are not affected by this feature.

## Affected Files

Expected implementation files:

- `apps/website/src/app/[locale]/admin/content/page.tsx`
- `apps/website/src/lib/i18n/get-dictionary.ts`
- `apps/website/src/app/[locale]/services/tax/page.tsx`
- `apps/website/src/app/[locale]/services/insurance/page.tsx`
- `apps/website/src/app/[locale]/services/immigration/page.tsx`
- `apps/website/src/app/[locale]/services/ai/page.tsx`

Implementation helper:

- `apps/website/src/lib/services/service-page-intros.ts`

## Testing And Verification

Implementation must keep description selection in a small pure helper so fallback behavior is easy to verify. Because `apps/website` currently has no test runner configured, do not add a new test framework just for this feature. Verify with:

- Typecheck/build for `apps/website`
- Lint for `apps/website`
- Manual browser check of the Services admin tab
- Manual browser check of at least `/en/services/immigration` and `/vi/services/immigration`

## Non-Goals

- Do not edit Homepage service card descriptions.
- Do not change `/services` overview card descriptions.
- Do not create a new table for public service page content.
- Do not migrate existing `site_content` data.
- Do not introduce rich text for these intro descriptions.
