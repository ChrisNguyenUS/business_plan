# Website Phase 4 — Post-Launch Hardening (Ads-Readiness Checklist)

**Goal:** verify everything required to run Facebook ads against `mannaos.com` and measure Phase A success metrics from the PRD.

The code scaffolding (GA4, Meta Pixel, Meta CAPI) is already wired. This checklist covers **dashboard setup + verification** that only you can do.

---

## 1. Google Analytics 4 — create property

1. Go to https://analytics.google.com → Admin → Create Property
2. Property name: `MannaOS.com`, time zone: `America/Chicago`, currency: `USD`
3. Add data stream → Web → URL `https://mannaos.com` → stream name `MannaOS Web`
4. Copy the **Measurement ID** (format `G-XXXXXXXXXX`)
5. In Vercel → Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` = your `G-...` ID (Production + Preview)
6. Redeploy (Vercel does this automatically on env change, or trigger a manual deploy)

**Verify (after redeploy):**
- Open `https://mannaos.com` in a new tab
- In GA4 → Reports → Realtime — you should see 1 active user within 30s
- Custom events to confirm fire when triggered: `generate_lead`, `schedule_click`, `phone_click`, `messenger_click`, `zalo_click`, `facebook_click`

---

## 2. Meta Pixel — create + verify browser firing

1. Go to https://business.facebook.com → Events Manager → Connect Data Sources → Web → Meta Pixel
2. Pixel name: `MannaOS Pixel`, URL: `https://mannaos.com`
3. Skip the "Add code" step — we already implemented it
4. Copy the **Pixel ID** (15–16 digits)
5. In Vercel env vars, add (Production + Preview):
   - `NEXT_PUBLIC_META_PIXEL_ID` = your pixel ID
6. Redeploy

**Verify browser firing:**
- Install the **Meta Pixel Helper** Chrome extension
- Open `https://mannaos.com` → Helper should show `PageView` ✅
- Submit the contact form → Helper should show `Lead` ✅
- Click "Book a free consultation" → Helper should show `Schedule` ✅
- Click the floating phone button → Helper should show `Contact` ✅

---

## 3. Meta Conversions API (CAPI) — server-side de-duplicated Lead

1. Events Manager → your Pixel → Settings → Conversions API → **Generate Access Token**
2. Copy the access token
3. Vercel env var (Production only — do not put on Preview unless you want test deploys to fire CAPI):
   - `META_CAPI_ACCESS_TOKEN` = the access token
4. (Optional) For first-time verification, also add `META_CAPI_TEST_EVENT_CODE` from Events Manager → Test Events tab. Remove after verification.
5. Redeploy

**Verify CAPI firing:**
- Events Manager → Test Events → enter `mannaos.com` → start session
- Submit the contact form once
- You should see **two Lead events** with the **same `event_id`** — one from Browser, one from Server. Meta auto-dedupes them so it counts as 1 conversion. This is the goal: even if a user blocks the browser pixel (iOS 14.5+, ad blockers), CAPI still records the Lead.
- Once verified, **remove `META_CAPI_TEST_EVENT_CODE`** from Vercel env so production traffic doesn't go to the test bucket.

---

## 4. Custom domain + DNS sanity check

`mannaos.com` is already live. Confirm:

- [ ] `https://mannaos.com` loads (no cert warning)
- [ ] `https://www.mannaos.com` redirects to `https://mannaos.com` (or vice-versa, pick one and stick with it)
- [ ] HTTP redirects to HTTPS
- [ ] Vercel → Project → Domains shows the domain as `Valid Configuration`

---

## 5. Live-site smoke test

Tick each on production. Use a private window so caching doesn't lie to you.

- [ ] Home `/en` and `/vi` render, language switcher swaps URL prefix
- [ ] All 4 service pages load: `/en/services/{tax,insurance,immigration,ai}` + VI equivalents
- [ ] About, Contact, Privacy Policy, Terms of Service all load on both locales
- [ ] Contact form submits successfully → check Supabase `contact_submissions` table → check Resend dashboard for the email → check Chris@mannaos.com inbox
- [ ] Calendly link opens the booking widget
- [ ] Floating buttons (Zalo, Messenger, Phone) all link to the right destinations
- [ ] Click `tel:` link on mobile triggers the dialer
- [ ] 404 page works (visit `/en/does-not-exist`)
- [ ] Sitemap loads at `https://mannaos.com/sitemap.xml`
- [ ] Robots loads at `https://mannaos.com/robots.txt`

---

## 6. Lighthouse + Core Web Vitals (Phase A budget)

Phase A budget per PRD: **mobile Lighthouse Performance ≥90, LCP <2.5s @ 4G**.

1. Run https://pagespeed.web.dev/ on `https://mannaos.com` — Mobile + Desktop
2. Record scores:
   - [ ] Mobile Performance ≥ 90
   - [ ] Mobile LCP < 2.5s (75th pct)
   - [ ] Mobile CLS < 0.1
   - [ ] Mobile INP < 200ms
   - [ ] SEO ≥ 95
   - [ ] Accessibility ≥ 90
   - [ ] Best Practices ≥ 90
3. If LCP is over budget — most common Phase A issues:
   - Hero image not optimized → use `next/image` with `priority`
   - Web fonts blocking → already using `next/font` so should be fine
   - Too much JS on initial load → check the contact page; analytics scripts use `afterInteractive` which is correct

Repeat for the 4 service overview pages — they'll be ad landing pages too.

---

## 7. Search Console + Bing Webmaster

**Google Search Console:**
1. https://search.google.com/search-console → Add property → Domain → `mannaos.com`
2. Verify via DNS TXT record (Vercel doesn't auto-handle this)
3. Submit sitemap: `https://mannaos.com/sitemap.xml`
4. Sitemaps tab should show ~22 URLs discovered (11 paths × 2 locales)
5. Coverage check after 48h — confirm pages are indexed

**Bing Webmaster Tools:**
1. https://www.bing.com/webmasters → Add site → `https://mannaos.com`
2. Import from GSC (easiest) or verify via DNS
3. Submit sitemap: `https://mannaos.com/sitemap.xml`

**International Targeting (GSC):**
- Check `Search Console → Settings → International Targeting` — should show **0 hreflang errors** within 7 days

---

## 8. Done — gate to start Facebook ads

When sections 1–7 are checked off:
- ✅ Pixel + CAPI both firing, deduped via shared `event_id`
- ✅ GA4 receiving custom events
- ✅ Lighthouse mobile ≥ 90 and LCP < 2.5s
- ✅ Domain valid, HTTPS, smoke tests pass
- ✅ GSC + Bing receiving sitemap

→ Mark `Website Phase 4` as `[x]` in `docs/ROADMAP.md` and start Facebook ad campaigns. Phase B (immigration SEO/GEO) can begin in parallel once ad funnel is firing.
