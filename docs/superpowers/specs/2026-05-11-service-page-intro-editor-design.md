# Services Content Editor Design

**Date:** 2026-05-11
**Scope:** `apps/website`
**Status:** Revised for review

## Goal

Add admin editing for service descriptions across all four public services:

- Tax & Business
- Insurance & Finance
- Immigration
- AI / Automation

The Services tab owns two kinds of service description content:

1. **Card Summary** — the short description shown in the four service cards on both the Homepage and `/services` overview page.
2. **Detail Page Intro** — the longer intro description shown at the top of each individual service detail page.

Homepage-only content such as the hero banner and trust badges remains in the Home tab.

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
  "service_content": {
    "tax": {
      "card_summary": {
        "description": {
          "en": "Tax preparation, extension filing, LLC setup, and full business registration services.",
          "vi": ""
        }
      },
      "detail_intro": {
        "description": {
          "en": "Professional tax preparation, business registration, and compliance services for individuals and businesses.",
          "vi": ""
        }
      }
    },
    "insurance": {
      "card_summary": {
        "description": {
          "en": "Life insurance, annuity, and retirement planning to protect your family's future.",
          "vi": ""
        }
      },
      "detail_intro": {
        "description": {
          "en": "Protect your family and secure your financial future with our licensed insurance services.",
          "vi": ""
        }
      }
    },
    "immigration": {
      "card_summary": {
        "description": {
          "en": "N-400 citizenship, green card, visa renewal, and expert immigration consultation.",
          "vi": ""
        }
      },
      "detail_intro": {
        "description": {
          "en": "Professional Vietnamese-language USCIS document preparation and consultation services. Bilingual support to help you navigate your immigration journey with confidence.",
          "vi": ""
        }
      }
    },
    "ai": {
      "card_summary": {
        "description": {
          "en": "Workflow automation, AI tools for small businesses, and digital transformation.",
          "vi": ""
        }
      },
      "detail_intro": {
        "description": {
          "en": "Workflow automation, AI tools for small businesses, and digital transformation.",
          "vi": ""
        }
      }
    }
  }
}
```

Reasoning:

- One nested object keeps all service description content together instead of scattering many top-level keys.
- Service slugs (`tax`, `insurance`, `immigration`, `ai`) match existing route/service identifiers.
- `card_summary` and `detail_intro` are explicit, so a short card description and a longer service page intro can evolve separately.
- Language fields are explicit (`en`, `vi`), which avoids ambiguous suffixes.
- Existing `tax_services`, `tax_offerings`, `immigration_form_bundles`, and pricing keys remain untouched for backward compatibility.
- Do not add new top-level keys such as `tax_desc_en`, `tax_desc_vi`, or `immigration_desc_vi`.
- Legacy message keys such as `services_tax_desc`, `services_immigration_desc`, `tax_desc`, and `immigration_desc` remain readable as fallbacks, but the admin editor must write to `service_content`.

## Admin UI

Keep the current high-level Content Editor tabs simple:

- Home
- About
- Services

Do not add a separate top-level Main Page button for service cards. Service card copy belongs in the Services tab because the same copy is reused on the Homepage and `/services`.

In the Services tab, each service card gets two clear panels above `What We Offer` and `Pricing`:

1. `Card Summary (Homepage + Services Page)`
2. `Service Detail Intro`

Each panel has two textarea fields:

- Description (English)
- Description (Vietnamese)

The panel labels must make the destination clear:

```txt
Card Summary (Homepage + Services Page)
Shown in the four service cards on the Homepage and /services.

Service Detail Intro
Shown at the top of /services/tax only.
```

The save flow continues to use the existing Content Editor save button and `/api/admin/content` endpoint.

## Public Page Behavior

Public pages read service description content from `getDictionary(locale)`.

For each locale:

- Homepage service cards and `/services` overview cards use `service_content[service].card_summary.description[locale]`.
- Service detail pages use `service_content[service].detail_intro.description[locale]`.
- If a `service_content` value is empty, fall back to the existing dictionary copy.

Card summary edits update both Homepage cards and `/services` cards. Detail intro edits update only the matching service detail page.

## Affected Files

Expected implementation files:

- `apps/website/src/app/[locale]/admin/content/page.tsx`
- `apps/website/src/lib/i18n/get-dictionary.ts`
- `apps/website/src/components/home/ServicesOverview.tsx`
- `apps/website/src/app/[locale]/services/page.tsx`
- `apps/website/src/app/[locale]/services/tax/page.tsx`
- `apps/website/src/app/[locale]/services/insurance/page.tsx`
- `apps/website/src/app/[locale]/services/immigration/page.tsx`
- `apps/website/src/app/[locale]/services/ai/page.tsx`

Implementation helper:

- `apps/website/src/lib/services/service-content.ts`

## Testing And Verification

Implementation must keep description selection in a small pure helper so fallback behavior is easy to verify. Because `apps/website` currently has no test runner configured, do not add a new test framework just for this feature. Verify with:

- Typecheck/build for `apps/website`
- Lint for `apps/website`
- Manual browser check of the Services admin tab
- Manual browser check that editing a card summary changes both `/en` Homepage service cards and `/en/services` cards
- Manual browser check that editing a detail intro changes only the matching service detail page

## Non-Goals

- Do not add a new top-level Main Page button just for service cards.
- Do not make detail intro edits update Homepage or `/services` cards.
- Do not create a new table for public service page content.
- Do not migrate existing `site_content` data.
- Do not introduce rich text for these intro descriptions.
