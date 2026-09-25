# Website Phase 3F — EB-3 Landing + Screening Form

**Date:** 2026-09-24
**App:** `apps/website/` only
**Branch:** `feat/website-eb3`
**Status:** Design approved in chat — awaiting written-spec review

## 1. Goal

Capture qualified EB-3 **Other Workers** (lao động phổ thông) leads on mannaos.com and route them into the existing lead pipeline so MannaOS can screen them before handoff to its partner.

Success = a visitor from Vietnam or the US can understand EB-3, see whether they fit, and either open a Messenger chat or submit a screening form that lands in `contact_submissions` + staff email + Meta CAPI `Lead`.

## 2. Business constraints (non-negotiable)

1. **Never name the partner.** MannaOS is a white label of an EB-3 partner. The partner's name/brand must not appear anywhere on the site: page copy, metadata, JSON-LD, form copy, or automated emails. Verification: `grep -ri immilink apps/website` returns nothing.
2. **MannaOS is not a law firm.** No copy may imply MannaOS provides legal services or legal advice. Use generic phrasing: "Hồ sơ pháp lý do luật sư di trú được cấp phép tại Mỹ đảm nhận" / "Legal filings are handled by licensed U.S. immigration attorneys."
3. **No guarantees.** No promise of approval, green card, or fixed timeline. Timeline is stated as an estimate ("khoảng 4–6 năm") dependent on USCIS / Department of State.
4. **No prices.** Cost *structure* only (option B). Price quotes happen in Messenger.
5. **Correct naming.** Use "EB-3 lao động phổ thông (Other Workers)". Never "lao động tự do".

## 3. Audiences

| Audience | Path | Note |
|---|---|---|
| In Vietnam | Consular processing (DS-260, interview in Ho Chi Minh City) | Primary contact: Facebook Messenger; Zalo optional |
| In the U.S. | Adjustment of status (I-485) | Must currently hold lawful status; primary contact: phone + Facebook |

## 4. Placement

- New route: `/[locale]/services/immigration/eb3` (vi + en).
- Existing Immigration page gets one **featured EB-3 card** above "What We Offer", linking to the new route.
- No new top-nav tab.
- Added to `sitemap.ts` with hreflang alternates.
- Copy lives in `src/messages/vi.json` / `en.json` under `eb3_*` keys. **Not** CMS-editable (YAGNI — first page of its kind).

## 5. Page sections (top → bottom)

1. **Hero** — headline "Định cư Mỹ diện EB-3 lao động phổ thông" + sub "không cần bằng cấp, không cần tiếng Anh giỏi". Primary CTA **"Nhắn Messenger tư vấn"** (`https://m.me/mannaonesolution?ref=eb3`), secondary CTA "Kiểm tra điều kiện" (anchor-scroll to form).
2. **EB-3 là gì** — 3 cards: Skilled / Professional / **Other Workers** (highlighted), 1–2 sentences each.
3. **Bạn đang ở đâu?** — 2 cards: 🇻🇳 Vietnam → consular processing; 🇺🇸 U.S. → I-485, with the note that lawful status is required.
4. **Quy trình 5 bước** — Eligibility review (48h) → Employer matching → PERM + I-140 → Visa Bulletin wait → Green card. Total "khoảng 4–6 năm", not guaranteed.
5. **Ai phù hợp** — common industries (food processing, hospitality, elder care, manufacturing); basic requirements (health, clean record, commitment to work for the sponsoring employer).
6. **Cấu trúc chi phí** — 4 groups, no numbers: employer-paid (PERM) · attorney fees · government fees (I-140, DS-260/I-485, medical exam) · MannaOS service fee. Paid by milestone. CTA "Nhắn Messenger để nhận báo giá".
7. **Screening form** — §6.
8. **FAQ** — 6–8 Q&As (family members, English requirement, what the Visa Bulletin is, changing status from a tourist visa, etc.). Rendered + `FAQPage` JSON-LD.
9. **Disclaimer** — "MannaOS là đơn vị hỗ trợ và điều phối hồ sơ, không phải hãng luật và không cung cấp tư vấn pháp lý. Hồ sơ pháp lý do luật sư di trú được cấp phép tại Mỹ đảm nhận. Thời gian xử lý phụ thuộc USCIS và Bộ Ngoại giao, không được bảo đảm."

JSON-LD: `FAQPage` + `Service` (provider = MannaOS). No partner entity.

## 6. Screening form

### Fields

| Field | Required | Condition |
|---|---|---|
| `full_name` | yes | always |
| `location` (`vn` \| `us`) | yes | always; drives the fields below |
| `facebook` (name or profile link) | yes if `vn`, optional if `us` | |
| `zalo` | optional | shown only if `vn` |
| `phone` | yes if `us` | shown only if `us` |
| `us_status` (`b1b2` \| `f1` \| `other_valid` \| `expired` \| `unknown`) | yes if `us` | shown only if `us` |
| `birth_year` | yes | 4-digit, 1940 ≤ year ≤ current year − 16 |
| `english` (`none` \| `basic` \| `conversational`) | yes | |
| `spouse` (bool), `children_under_21` (0–10) | optional | |
| `prior_us_visa_denial` (bool) | yes | |
| `timeline` (`now` \| `3_6_months` \| `researching`) | yes | |
| `notes` | optional | max 1000 chars |
| `ack_not_law_firm` | yes (must be `true`) | disclaimer checkbox |

`us_status = expired` is **accepted**, not rejected; the formatted message carries a ⚠️ flag for review.

**Not asked on the form:** criminal history, medical conditions, exact finances — collected on the screening call.

### Data flow (no DB migration)

```
Eb3ScreeningForm (client)
  └─ POST /api/contact
       { full_name, phone?, facebook?, zalo?, service_type: "eb3",
         message: formatEb3Message(answers), locale, utm_*, event_id, ... }
       ├─ contact_submissions insert (service_type = "eb3")
       ├─ Resend staff email "[MannaOS] New Contact: <name> — eb3"
       └─ Meta CAPI Lead (content_name = "eb3")
```

### `/api/contact` change

- Accept optional `facebook` and `zalo` strings.
- Validation becomes: `full_name` AND at least one of `email | phone | facebook | zalo`. Existing contact form (email/phone) behaves exactly as before.
- When present, `facebook` / `zalo` are prepended to `message` as `Facebook: …` / `Zalo: …` lines (no new columns). Included in the staff email.
- Error message updated to "Name and a contact method are required."

### Pure logic — `src/lib/services/eb3-screening.ts`

- `validateEb3(answers): { ok: true } | { ok: false; errors: Record<field, code> }` — enforces the table above, including conditional requirements by `location`.
- `formatEb3Message(answers): string` — fixed-order, one field per line, human-readable labels (Vietnamese), `⚠️ Visa đã hết hạn — cần xem kỹ` line when `us_status = expired`.
- No React, no fetch — unit-testable.

### Form UX

- Fields swap on `location` change; hidden fields are cleared so stale values are never submitted.
- Client validation via `validateEb3` before submit; server remains authoritative.
- Honeypot `website` field, same as the contact form.
- Success screen: "Cảm ơn bạn! MannaOS sẽ liên hệ qua Messenger/điện thoại trong 48 giờ." + "Nhắn Messenger ngay" button.
- Error: inline message, form stays filled.

### Tracking

- Messenger click on EB-3 page: `fbq Contact {method: "messenger", service: "eb3"}` + GA `messenger_click {service: "eb3"}`.
- Successful submit: `fbq Lead {content_name: "eb3"}` with the same `event_id` sent to CAPI (dedup).

## 7. Files

| File | New/Edit |
|---|---|
| `src/lib/services/eb3-screening.ts` | new |
| `src/lib/services/eb3-screening.test.ts` | new |
| `src/app/[locale]/services/immigration/eb3/page.tsx` | new |
| `src/components/services/Eb3ScreeningForm.tsx` | new |
| `src/app/api/contact/route.ts` | edit |
| `src/app/[locale]/services/immigration/page.tsx` | edit (featured card) |
| `src/messages/vi.json`, `src/messages/en.json` | edit (`eb3_*` keys) |
| `src/app/sitemap.ts` | edit |
| `src/app/[locale]/admin/submissions/page.tsx` | edit (`whitespace-pre-line` on message) |
| `docs/ROADMAP.md` | edit (Phase 3F entry) |

## 8. Testing

- **Unit (TDD, vitest):** `validateEb3` — VN without facebook → error; US without phone → error; US without `us_status` → error; missing ack → error; birth year out of range → error; VN with only facebook → ok; US with `expired` → ok. `formatEb3Message` — field order, conditional lines, ⚠️ flag.
- **API:** facebook-only payload → 200; legacy email payload → 200 unchanged; no contact method → 400.
- **Manual on Vercel preview:** submit VN + US variants → row in `contact_submissions`, staff email received, event in Meta Test Events; language switcher vi↔en; mobile width 375px.
- **Content check:** `grep -ri immilink apps/website` → empty.

## 9. Out of scope

- CMS editing of EB-3 copy.
- Dedicated EB-3 client app / case tracker (revisit when ~10 active cases need status visibility — extend the existing Portal).
- New DB columns or a dedicated leads table.
- Price display.

## 10. Roadmap

Add `- [ ] **Website Phase 3F — EB-3 landing + screening**` to `docs/ROADMAP.md` (approved to run before Phase 4); tick on ship.

## 11. Commits (atomic)

1. `eb3-screening.ts` + tests
2. `/api/contact` accepts facebook/zalo
3. vi/en copy
4. EB-3 page + form
5. Immigration featured card + sitemap
6. Admin submissions `whitespace-pre-line`
7. Roadmap
