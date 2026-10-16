# N400 Ready — Public, Indexable Pages (Landing + State Answers)

**Date:** 2026-10-16
**App:** `apps/website/` only. No database migration.
**Status:** Approved by owner 2026-10-16 (all six decisions in §14 answered). Next: implementation plan.
**Path:** Architectural (new public route tree, middleware change, new SEO surface).
**Follows:** SEO/GEO technical fixes (2026-10-15) and the SEO blog with six Vietnamese N-400 articles, live 2026-10-16 (`specs/2026-10-15-website-seo-blog-design.md`).

## 1. Goal

N400 Ready has no page Google or AI answer engines can read. An anonymous request to `/n400ready` is redirected to `/n400ready/login`, so the product gets no search traffic of its own. This spec adds a small set of public, server-rendered pages that:

1. rank for Vietnamese (and English) citizenship-test searches that the blog does not already target, and
2. send readers to sign up for N400 Ready.

Success means:
1. `/vi/n400ready` and `/en/n400ready` are server-rendered landing pages with full text in the HTML (no JavaScript needed), canonical, hreflang, and JSON-LD.
2. There are 56 state/territory answer pages per language. Each shows the official civics questions whose answers depend on where you live (Q23 senators, Q29 representative, Q61 governor, Q62 capital), with that place's current answers and a visible "data checked on" date.
3. An anonymous visitor who opens `/n400ready` lands on the landing page, not the login form. Signed-in users see no change.
4. Every new page is in `sitemap.xml`. Every page links to sign-up, to the related blog articles, and to uscis.gov.
5. No page competes with a live blog article for the same main search (§4).

## 2. Constraints (non-negotiable)

1. **Not a law firm.** Every page carries the non-attorney disclosure plus a line saying N400 Ready is not affiliated with USCIS. Pages inform; they never say a reader qualifies for anything.
2. **No expertise claims.** No "chuyên gia", "expert" or "chuyên môn di trú" (8 CFR 1.2).
3. **Never name the EB-3 partner.**
4. **"Miễn phí" is allowed.** The owner approved calling N400 Ready free on 2026-10-15. No pass guarantees, no made-up ratings, and no `aggregateRating` in JSON-LD.
5. **Facts are dated and sourced.** Officials' names come from the app's data files and show a visible "kiểm tra ngày …" date with links to uscis.gov/citizenship/testupdates, senate.gov and house.gov. If our data and USCIS disagree, the page says USCIS is the standard.
6. **One H1 per page.** Both locales use the same page structure.
7. **Separation of concerns.** Page data comes from pure functions in `src/lib/n400/public/`. React components only render it. Nothing touches the database. Everything reads the static `state-data.ts`, `reps-data.ts` and `questions-data.ts`, the same files learners use.
8. **Phase boundary.** These are marketing pages under `[locale]`. They do not change any in-app screen, so the N400 in-app UI rules (hero recipe, no-scroll hubs, Civics UI reuse) do not apply.

## 3. Current state (verified 2026-10-16)

| Area | Today |
|---|---|
| `/n400ready` for anonymous users | `middleware.ts` sends every `/n400ready/*` path except `/n400ready/login` to `/n400ready/login` (307). Googlebot sees only the login form. |
| App language | Set by the `n400_lang` cookie, with one URL per screen and Vietnamese as the default. A cookie-switched page can't carry hreflang, so a crawler only ever sees one language there. **Public pages therefore must live under `/[locale]/`.** |
| `/vi/n400ready` | Does not exist. `N400_RE` is anchored at `^/n400ready`, so `/vi/n400ready/*` already falls into the public `[locale]` tree and needs no auth. |
| Question data | `src/lib/n400/questions-data.ts` (generated): 128 questions in Vietnamese and English that match the 2025 USCIS list. It has **one** taught answer per question; the official list allows more. Location-based questions: **23, 29, 61, 62** (`isLocationBased`). There is no 65/20 (★) flag. |
| State data | `state-data.ts`: 56 entries (50 states, DC and 5 territories) with governor, capital and senators. `reps-data.ts`: 441 House members by district, with audio. `personalization.ts`: `buildCivicsPersonalization()`. |
| Blog (live) | Article #2 is `/vi/blog/128-cau-hoi-thi-quoc-tich-my`: the full 128 questions in Vietnamese with official answers and ★ marks. Article #3 is `/vi/blog/thi-quoc-tich-my-cho-nguoi-tren-65-tuoi`: the 20 questions for the 65/20 group. Both link to `/n400ready`. |
| Sitemap / robots / llms.txt | The sitemap has no N400 Ready URLs. `robots.ts` blocks only api, admin and portal. `llms.txt` links `/n400ready`, which crawlers see as a redirect to login. |
| Attribution | The middleware already sets the first-touch cookie (with landing page) on any first visit, so sign-ups from these pages are attributed in `n400_lead_profiles` with no new code. |

### 3.1 Data findings to fix as part of this work

These were found while reading `state-data.ts`. Check each against the official USCIS 2025 list (M-1778) before fixing:

- **DC governor:** the data teaches "Muriel Bowser". The USCIS note for Q61 says D.C. residents should answer that D.C. does not have a governor. The app teaches this too, so it affects learners as well as the new pages.
- **Territory capitals:** all five territories have `capital: null`. The USCIS note for Q62 says territory residents should name the territory's capital. Only D.C. answers "not a state, no capital".
- **Election timing:** U.S. midterms are on **2026-11-03**. New senators and representatives take office 2027-01-03, and most new governors in January 2027. The data and these pages go stale at that point (§9).

## 4. Search intent and blog coordination

Rule: **one main search target per URL**. The blog already owns the list-style searches, so the new pages go after the searches the blog can't answer well.

| Search (Vietnamese autocomplete seen 2026-10-15 unless marked *) | Owner page | Why |
|---|---|---|
| 128 câu hỏi thi quốc tịch mỹ 2026 / tiếng việt | **Blog #2** (live) | Already a full reference list with official answers. A second list page would split the ranking. |
| thi quốc tịch mỹ cho người trên 65 tuổi | **Blog #3** (live) | Already covers 65/20, 50/20, 55/15 and N-648. |
| 128 câu hỏi … tiếng việt **pdf** | **Blog #2** (no PDF: owner decision 2026-10-16) | Not targeted. The search wants a file, and none will be built. |
| app / ứng dụng luyện thi quốc tịch mỹ miễn phí; luyện thi quốc tịch mỹ online* | **`/vi/n400ready`** (new) | Product intent. The blog can't rank here. |
| thi quốc tịch mỹ [Texas / California …]; thượng nghị sĩ tiểu bang … thi quốc tịch; dân biểu của tôi là ai* | **`/vi/n400ready/states/[state]`** (new) | Each page has unique, location-specific facts. The blog can't list 56 × 4 answers. |

\* Not yet checked in autocomplete or Search Console. The implementation plan starts with a 15-minute check of autocomplete and GSC queries, and the copy may be adjusted. The page structure stays the same.

Cross-links (each one keeps the main target in one place):
- Blog #2 → "Câu 23, 29, 61, 62: xem đáp án theo tiểu bang của bạn" → `/vi/n400ready#states` (state grid on the landing page).
- Blog #3 → `/vi/n400ready`.
- Landing → blog #2 (full list), #3 (65+), #1 pillar. The landing page **does not** repeat the 128 questions.
- State page → blog #2 (full list), landing, and its own Q23/29/61/62 answers.
- Live blog posts are edited through admin or a one-row SQL upsert keyed on `slug_vi`, only after the owner approves the wording at that step.

## 5. Approaches considered

**A. Landing + 56 state pages, blog keeps the list (recommended).** Each new page has content found nowhere else on the site. There's no cannibalization, only 1 + 56 pages per locale, all from static data, so there's no DB or runtime risk.

**B. Move the 128 list into N400 Ready (`/vi/n400ready/128-cau-hoi`) and shorten blog #2.** This gives an app-branded list page with a sign-up CTA next to each category. But it throws away a page that went live yesterday and is being indexed, and it means maintaining two copies of official answers. Rejected for now. Revisit if GSC shows #2 ranking poorly after about 8 weeks.

**C. One page per question (128 × 2 locales).** This matches long-tail searches ("ai viết tuyên ngôn độc lập"). With one taught answer per question, most pages would be thin. It's a big programmatic-SEO bet before anything is measured. Deferred (§13).

## 6. URLs and routing

| URL | Content | Rendering |
|---|---|---|
| `/vi/n400ready`, `/en/n400ready` | Landing (§7) with a state grid at `#states` | Server Component, static (`generateStaticParams` for locales), inherits `revalidate = 30` |
| `/vi/n400ready/states/[state]`, `/en/n400ready/states/[state]` | State answers (§8) | Server Component, `generateStaticParams` = 2 locales × 56 slugs; `dynamicParams = false` (unknown slug → 404) |
| `/vi/n400ready/states`, `/en/n400ready/states` | 308 → `/[locale]/n400ready#states` | No separate index page (avoids a thin duplicate) |

- **State slug** is `nameEn` in kebab case: `texas`, `new-york`, `district-of-columbia`, `northern-mariana-islands`, `virgin-islands`. A pure map `stateSlug(code)` / `stateFromSlug(slug)` lives in `src/lib/n400/public/state-slugs.ts`. Nothing is translated: Vietnamese state names equal English ones except DC and territories, and one slug per place keeps hreflang pairs simple.
- **Folder:** `src/app/[locale]/n400ready/…`. This is a different route tree from `src/app/n400ready/…` (the app). They share no layout.
- **Middleware change (one spot):** when there is **no user** and the path is **exactly** `/n400ready` (or `/n400ready/`), redirect 307 to `/${lang}/n400ready`. `lang` is the `n400_lang` cookie if set, otherwise the existing Accept-Language rule (`vi` if it contains "vi", else `en`). Deep paths (`/n400ready/practice`, …) still go to `/n400ready/login`. The decision moves into a pure function `anonN400Redirect(pathname, cookieLang, acceptLanguage)` in `src/lib/n400/public/anon-redirect.ts`, so it can be unit-tested (the middleware has no tests today).
- **Login page:** add `robots: { index: false, follow: true }` to `/n400ready/login` metadata. It's a form, not content.
- **CTA targets:** "Bắt đầu miễn phí / Start free" → `/${locale}/signup`, the same entry the N400 login page links to. "Đã có tài khoản? Đăng nhập" → `/n400ready/login`. The plan's first task is to confirm that a sign-up from `/vi/signup` ends in N400 Ready onboarding with `n400_lang=vi`. If it doesn't, add `?lang=` handling to the middleware for `/n400ready/login` (sets the cookie) and send the CTA through it.
- **Signed-in visitors** on a public page see the same static page. "Mở ứng dụng" links to `/n400ready`, which for them is the dashboard. No per-user rendering, so the pages stay static.

## 7. Landing page (`/[locale]/n400ready`)

Order (Vietnamese copy shown; English mirrors it):

1. **Breadcrumb:** Trang chủ › N400 Ready.
2. **H1:** "N400 Ready — luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt". The first two sentences answer what it is and who it's for: practice for the 2025 civics test (128 questions), reading, writing, speaking and a full mock interview, in Vietnamese and English, free, on phone or computer.
3. **CTA block:** Bắt đầu miễn phí · Đăng nhập.
4. **"Luyện những gì":** five short items matching the app's real modules (Civics 128 câu; Đọc; Viết; Nói / Speaking; Phỏng vấn thử đầy đủ). Each is one sentence. No feature the app doesn't have.
5. **"Đáp án theo nơi bạn sống":** explains that 4 of the 128 questions depend on your state and district, and that the app fills them in from your address. Then the **state grid** (`id="states"`): 56 links, states A–Z, then DC and territories. This is the internal-link hub for §8.
6. **"Thi bài 2025 hay 2008? Trên 65 tuổi?":** two sentences each, linking blog #1 and #3. No rules repeated.
7. **"Danh sách đầy đủ 128 câu":** one sentence plus a link to blog #2.
8. **FAQ** (5–6 entries, visible): Có thật miễn phí không? Có cần tiếng Anh giỏi không? Dùng trên điện thoại được không? Đáp án tiểu bang lấy ở đâu? N400 Ready có phải của USCIS không? (No.) Có tư vấn pháp lý không? (No: non-attorney disclosure, with a pointer to a licensed attorney and to `/[locale]/services/immigration` and its state caveat.)
9. **Disclosure footer:** non-attorney + not affiliated with USCIS + "Danh sách chính thức trên uscis.gov là chuẩn."

Visuals: one or two real app screenshots (owner decision §14.4), otherwise no images. Reuse the marketing site's existing section and button components. Don't import in-app N400 components.

**Metadata:**
- `title` "N400 Ready: luyện thi quốc tịch Mỹ miễn phí (tiếng Việt)" / "N400 Ready: free U.S. citizenship test practice (Vietnamese & English)"
- `description` ≤ 160 characters, including "miễn phí" and "128 câu"
- canonical to itself, hreflang vi/en, `x-default` = en (same rule as the static pages in `sitemap.ts`)
- OG = site OG image

**JSON-LD** (one `@graph`, built by a pure `landingJsonLd(locale)`):
- `WebApplication`: `name`, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `offers {price: 0, priceCurrency: "USD"}`, `inLanguage: ["vi","en"]`, `publisher {@id: ORGANIZATION_ID}`, `url`
- `BreadcrumbList`
- `FAQPage` built from the same array the page renders

## 8. State page (`/[locale]/n400ready/states/[state]`)

Example: `/vi/n400ready/states/texas`.

1. **Breadcrumb:** Trang chủ › N400 Ready › Texas.
2. **H1:** "Thi quốc tịch Mỹ ở Texas: đáp án 4 câu hỏi theo tiểu bang" / "U.S. citizenship test in Texas: answers to the 4 state-specific questions".
3. **Lead (2–3 sentences):** in the 2025 civics test, questions 23, 29, 61 and 62 depend on where you live. Here are the answers for Texas as of {checked date}. Answer with whoever holds the office on your interview day.
4. **Four answer cards.** Each shows the question number, the question in the page language with the other language underneath (bilingual, as in the app), and the answer:
   - **Q23 senators:** both names. For DC and territories, show the USCIS rule text ("không có thượng nghị sĩ").
   - **Q29 representative:** a table of district → representative for that state (from `reps-data.ts`), with at-large shown as "At-Large" (`districtLabel`). Below it: "Không biết mình ở quận nào? N400 Ready tìm theo địa chỉ khi bạn đăng ký" (CTA) plus a link to house.gov's find-your-representative tool. Territories show their delegate or resident commissioner with the USCIS note.
   - **Q61 governor:** the name. DC shows the USCIS rule (§3.1).
   - **Q62 capital:** the capital. DC shows the USCIS rule. Territories show the capital once §3.1 is fixed.
   - A ★ marks a question in the 65/20 set (Q61 is ★ per blog #2), with a link to blog #3. A small constant `SIXTY_FIVE_TWENTY_IDS` in `src/lib/n400/public/` holds only the location-based ★ ids. A full ★ flag in `questions-data.ts` is out of scope (§13).
5. **"Dữ liệu cập nhật":** "Kiểm tra ngày {N400_OFFICIALS_CHECKED_ON}. Sau bầu cử ngày 3/11/2026, người đắc cử nhậm chức vào tháng 1/2027." Links: uscis.gov/citizenship/testupdates, senate.gov, house.gov, the state's official site. The second sentence is shown only while today is between the election and 2027-01-31 (pure `electionNotice(date)`).
6. **CTA block:** "Luyện 128 câu với đáp án Texas đã điền sẵn" → sign up.
7. **Related:** links to 4–6 neighboring or largest-Vietnamese-population states (a fixed list: TX, CA, WA, GA, FL, VA, …), the landing page, and blog #2.
8. **Disclosure footer** (as on the landing page).

**Metadata:**
- `title` "Thi quốc tịch Mỹ Texas: thượng nghị sĩ, dân biểu, thống đốc, thủ phủ" / "Texas citizenship test answers: senators, representative, governor, capital"
- description names the officials (≤ 160 characters)
- canonical, hreflang vi/en, `x-default` = en

**JSON-LD:** `BreadcrumbList` + `FAQPage` with the four Q/A pairs (structured data matches the visible text). No `GovernmentOrganization`/`Person` nodes (YAGNI).

**Thin-content guard:** every state page has unique names in all four answers and a unique district table. The shared explanatory text stays short (lead + notice + CTA), so unique text clearly outweighs shared text.

## 9. Data freshness

- Add `export const N400_OFFICIALS_CHECKED_ON = '2026-10-16'` next to `STATES` in `state-data.ts`. The pages read it. The app may later show it too (not in scope).
- **ROADMAP to-do (added on ship):** "Tháng 1/2027: cập nhật thượng nghị sĩ / dân biểu / thống đốc sau bầu cử 2026 trong `state-data.ts` + `reps-data.ts` (+ audio app), đổi `N400_OFFICIALS_CHECKED_ON`." This also fixes the app for learners. The pages only expose the date.
- Because pages are static, a data change redeploys them. No ISR tricks needed.

## 10. Sitemap, llms.txt, internal links

- `sitemap.ts`: add `urls("/n400ready", 0.9, "monthly")` and 56 × `urls("/n400ready/states/<slug>", 0.6, "monthly")`, using the same `urls()` helper (hreflang en/vi, no `lastModified`, following the existing rule).
- `llms.txt`: change the N400 Ready link to `/vi/n400ready` (Vietnamese section) and `/en/n400ready`. The existing test ("every link is a live sitemap URL") will then pass for real instead of through the hand-added `/n400ready` exception, which the test should drop.
- Site navigation: add "N400 Ready" to the immigration service page and the footer, pointing to `/[locale]/n400ready`. Any marketing-site link that currently points to `/n400ready` and is meant for anonymous visitors changes to `/[locale]/n400ready`. The plan lists them by grep.

## 11. Files (all in `apps/website/`)

| File | Purpose |
|---|---|
| `src/lib/n400/public/state-slugs.ts` | `stateSlug`, `stateFromSlug`, `ALL_STATE_SLUGS` (pure) |
| `src/lib/n400/public/state-page.ts` | `buildStatePage(code, locale)` → `{ stateName, questions: [{id, q, qAlt, answer, star, note}], districts, related }`. Wraps `buildCivicsPersonalization` and the USCIS DC/territory rules. Pure. |
| `src/lib/n400/public/seo.ts` | `landingMetadata`, `stateMetadata`, `landingJsonLd`, `stateJsonLd`, `electionNotice` (pure) |
| `src/lib/n400/public/copy.ts` | vi/en strings for both pages (the app's `i18n/vi.ts` is cookie-world and not reused here) |
| `src/lib/n400/public/anon-redirect.ts` | the middleware decision (pure) |
| `src/app/[locale]/n400ready/page.tsx` | landing |
| `src/app/[locale]/n400ready/states/[state]/page.tsx` | state page |
| `src/app/[locale]/n400ready/states/page.tsx` | 308 to `#states` |
| `src/components/n400-public/*` | `StateGrid`, `AnswerCard`, `DistrictTable`, `CtaBlock`, `Disclosure` (render only). `CtaBlock`/`Disclosure` appear on both pages and may also be reused from the blog later. |
| `src/middleware.ts` | call `anonN400Redirect` |
| `src/lib/n400/state-data.ts` | DC/territory fixes (§3.1), `N400_OFFICIALS_CHECKED_ON` |
| `src/app/n400ready/(auth)/login/page.tsx` (or its layout) | noindex |
| `src/app/sitemap.ts`, `src/lib/seo/llms-txt.ts` | §10 |

## 12. Slices

1. **S1: landing + anon redirect.** Landing (vi/en), `anonN400Redirect`, login noindex, sitemap/llms.txt entries for the landing, footer/service links. Shippable alone.
2. **S2: state pages.** State data fixes (§3.1) + 56 × 2 pages + sitemap + blog #2/#3 link edits (owner OK on wording).
(A third slice, a downloadable 128-question PDF, was dropped by the owner on 2026-10-16.)

## 13. Out of scope (later)

- A no-sign-up "thử 5 câu" quiz on the landing page (conversion lift, but it needs Civics-UI reuse rules decided for a public page).
- One page per question (approach C), only after GSC shows demand.
- A full 65/20 ★ flag in `questions-data.ts` and the generator.
- A public address → district lookup (Geocodio cost and abuse for anonymous users). The app's onboarding already does this after sign-up.
- Moving the 128 list from blog #2 into the app (approach B).
- English blog articles.
- A downloadable 128-question PDF (owner said no, 2026-10-16).

## 14. Owner decisions

1. ✅ **Answered 2026-10-16: approach A.** Blog #2 keeps the 128 list; the new pages are the landing page plus the state pages.
2. ✅ **Answered 2026-10-16: both languages.** Every page ships as one Vietnamese version and one English version (`/vi/…` + `/en/…`, hreflang pairs).
3. ✅ **Answered 2026-10-16: no PDF.** Not built. The "…pdf" searches are not targeted.
4. ✅ **Answered 2026-10-16: two real app screenshots** on the landing page (Civics practice + state personalization).
5. ✅ **Answered 2026-10-16: fix them to match USCIS.** The app's taught answers for DC and the territories change too. Rows with no matching audio show text only.
6. ✅ **Answered 2026-10-16: yes.** Add the landing and state-page links to the two live posts. The exact wording is shown to the owner before saving.

## 15. Testing

- **Unit (vitest, node):** `state-slugs` (56 unique slugs, round trip, unknown → null); `buildStatePage` (TX normal; an at-large state; DC: no senators, no governor, no capital rule text; a territory: delegate + capital; ★ on Q61 only); `seo` (canonical/hreflang/x-default, `WebApplication` fields with price 0 and no rating, FAQPage text equals the rendered array, state description ≤ 160 characters for all 56); `electionNotice` (before / during / after window); `anonN400Redirect` (exact root vs deep path, cookie beats Accept-Language, signed-in not called); sitemap includes 1 + 56 N400 URLs per locale with hreflang and no `lastModified`; llms.txt test without the `/n400ready` exception.
- **Render:** `renderToStaticMarkup` of a state page contains all four answers and exactly one `<h1>`.
- **Integration (dev server + curl, no JS):** `/vi/n400ready` and `/vi/n400ready/states/texas` return 200 with full text, one canonical, hreflang pair and parseable JSON-LD; `/vi/n400ready/states/atlantis` → 404; `/vi/n400ready/states` → 308; anonymous `/n400ready` → 307 to `/vi/n400ready` (and to `/en/…` with `Accept-Language: en`); anonymous `/n400ready/practice` → login; `/n400ready/login` has `noindex`.
- **Signed-in regression:** a signed-in `/n400ready` still reaches the dashboard / onboarding gate. Check with the visual-verification recipe, or at least by reading the middleware code path plus a unit test of the decision.
- Full website suite, `tsc --noEmit` and `eslint` stay at 0.
- **After deploy:** Rich Results Test on the landing and one state page. GSC: request indexing for `/vi/n400ready` and submit the sitemap again.

## 16. Rollout (each outward step needs the owner's OK at that moment)

1. ✅ Owner approved this spec 2026-10-16 → writing-plans.
2. S1 on a branch → tests → push → verify live → GSC request indexing.
3. S2 on a branch → tests → push → verify 3 sample state pages live → owner approves blog #2/#3 link edits → apply.
4. About 8 weeks after S2: read GSC queries and clicks for `/vi/n400ready*` vs blog #2, then decide on approaches B/C and the quiz.
