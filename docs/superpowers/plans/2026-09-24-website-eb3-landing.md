# Website EB-3 Landing + Screening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/[locale]/services/immigration/eb3`, a bilingual EB-3 Other Workers landing page whose Messenger CTA and screening form feed the existing `/api/contact` lead pipeline.

**Architecture:** Pure screening logic (`validateEb3`, `formatEb3Message`, `buildEb3Payload`) lives in `src/lib/services/eb3-screening.ts`. A client form component uses it and POSTs to the existing `/api/contact` route, which gains optional `facebook`/`zalo` contact fields. The page is a static server component reading copy from a nested `eb3` object in `src/messages/{vi,en}.json`. No DB migration.

**Tech Stack:** Next.js (App Router, custom version — see `apps/website/AGENTS.md`), React, TypeScript, Tailwind, lucide-react, vitest, Supabase JS, Resend, Meta Pixel/CAPI.

**Spec:** `docs/superpowers/specs/2026-09-24-website-eb3-landing-design.md`

## Global Constraints

- All edits confined to `apps/website/` plus `docs/ROADMAP.md`.
- **Never name the partner.** `grep -ri immilink apps/website/src` must return nothing.
- No copy may imply MannaOS provides legal services or legal advice; no guarantee of approval or timeline; no prices.
- Use "EB-3 lao động phổ thông (Other Workers)"; never "lao động tự do".
- Messenger URL: `https://m.me/mannaonesolution?ref=eb3`.
- Copy lives under a single nested `eb3` key in `src/messages/vi.json` and `src/messages/en.json` (the spec's "`eb3_*` keys" — nested because FAQ/steps need arrays). Both files must have identical `eb3` shape.
- Birth year: 1940 ≤ year ≤ currentYear − 16. Notes ≤ 1000 chars. Children under 21: integer 0–10.
- `us_status = "expired"` is accepted and flagged `⚠️ Visa đã hết hạn — cần xem kỹ`.
- `service_type` for EB-3 leads is exactly `"eb3"`.
- Legacy contact form behavior (email/phone payloads) must not change.
- Work on branch `feat/website-eb3`. One commit per task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before writing page/route code, skim `apps/website/node_modules/next/dist/docs/01-app` for any deprecation relevant to route handlers / page `params` (existing pages use `params: Promise<{ locale: string }>` — follow that).

## Review Focus

1. **Whitespace-only contact values** (`facebook: "   "`) must count as missing in both `validateEb3` and `/api/contact` — tests in Task 1 and Task 2.
2. **Switching location after typing** (VN → US with Zalo filled, or US → VN with phone/visa filled) must never submit the stale fields — `buildEb3Payload`/`formatEb3Message` tests in Task 1.
3. **Legacy contact form payloads** (email only, message only) must reach the DB byte-identical, no `Facebook:` prefix — test in Task 2.
4. **vi/en copy drift** — a key present in one locale but not the other renders `undefined` on the page — shape-parity test in Task 3.
5. **Partner name leak** via copy — `immilink` scan test in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/website/src/lib/services/eb3-screening.ts` (new) | Types, `emptyEb3Answers`, `validateEb3`, `formatEb3Message`, `buildEb3Payload`. No React, no fetch. |
| `apps/website/src/lib/services/eb3-screening.test.ts` (new) | Unit tests for the above. |
| `apps/website/src/app/api/contact/route.ts` (modify) | Accept `facebook`/`zalo`; relax contact validation; prepend handles to message; email renders line breaks. |
| `apps/website/src/app/api/contact/route.test.ts` (new) | Route tests with mocked Supabase + CAPI. |
| `apps/website/src/messages/vi.json`, `en.json` (modify) | `eb3` copy object. |
| `apps/website/src/messages/eb3-copy.test.ts` (new) | vi/en shape parity + partner-name scan. |
| `apps/website/src/components/services/Eb3MessengerButton.tsx` (new) | Tracked Messenger link (used 3×: hero, cost, success). |
| `apps/website/src/components/services/Eb3ScreeningForm.tsx` (new) | Client form: location-driven fields, submit, success/error. |
| `apps/website/src/app/[locale]/services/immigration/eb3/page.tsx` (new) | Static page, metadata, JSON-LD. |
| `apps/website/src/app/[locale]/services/immigration/page.tsx` (modify) | Featured EB-3 card. |
| `apps/website/src/app/sitemap.ts` (modify) | Add EB-3 URL. |
| `apps/website/src/app/[locale]/admin/submissions/page.tsx` (modify) | `whitespace-pre-line` on message. |
| `docs/ROADMAP.md` (modify) | Phase 3F entry. |

---

### Task 1: EB-3 screening logic

**Files:**
- Create: `apps/website/src/lib/services/eb3-screening.ts`
- Test: `apps/website/src/lib/services/eb3-screening.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Task 4):
  ```ts
  export type Eb3Location = "vn" | "us";
  export type Eb3UsStatus = "b1b2" | "f1" | "other_valid" | "expired" | "unknown";
  export type Eb3English = "none" | "basic" | "conversational";
  export type Eb3Timeline = "now" | "3_6_months" | "researching";
  export interface Eb3Answers { full_name: string; location: Eb3Location | ""; facebook: string; zalo: string; phone: string; us_status: Eb3UsStatus | ""; birth_year: string; english: Eb3English | ""; spouse: boolean; children_under_21: number; prior_us_visa_denial: boolean | null; timeline: Eb3Timeline | ""; notes: string; ack_not_law_firm: boolean; }
  export type Eb3Field = keyof Eb3Answers;
  export type Eb3ErrorCode = "required" | "invalid";
  export type Eb3Errors = Partial<Record<Eb3Field, Eb3ErrorCode>>;
  export type Eb3Validation = { ok: true } | { ok: false; errors: Eb3Errors };
  export interface Eb3ContactPayload { full_name: string; phone: string; facebook: string; zalo: string; service_type: "eb3"; message: string; }
  export const EB3_NOTES_MAX = 1000;
  export const EB3_CHILDREN_MAX = 10;
  export function emptyEb3Answers(): Eb3Answers;
  export function validateEb3(a: Eb3Answers, currentYear?: number): Eb3Validation;
  export function formatEb3Message(a: Eb3Answers): string;
  export function buildEb3Payload(a: Eb3Answers): Eb3ContactPayload;
  ```

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/lib/services/eb3-screening.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildEb3Payload,
  emptyEb3Answers,
  formatEb3Message,
  validateEb3,
  type Eb3Answers,
} from "./eb3-screening";

const YEAR = 2026;

function vn(overrides: Partial<Eb3Answers> = {}): Eb3Answers {
  return {
    ...emptyEb3Answers(),
    full_name: "Nguyễn Văn An",
    location: "vn",
    facebook: "facebook.com/an.nguyen",
    birth_year: "1990",
    english: "basic",
    prior_us_visa_denial: false,
    timeline: "now",
    ack_not_law_firm: true,
    ...overrides,
  };
}

function us(overrides: Partial<Eb3Answers> = {}): Eb3Answers {
  return {
    ...emptyEb3Answers(),
    full_name: "Trần Thị Bình",
    location: "us",
    phone: "(346) 555-0123",
    us_status: "b1b2",
    birth_year: "1985",
    english: "none",
    prior_us_visa_denial: false,
    timeline: "3_6_months",
    ack_not_law_firm: true,
    ...overrides,
  };
}

function errorsOf(a: Eb3Answers) {
  const r = validateEb3(a, YEAR);
  return r.ok ? {} : r.errors;
}

describe("validateEb3", () => {
  it("accepts a complete VN answer with only Facebook as contact", () => {
    expect(validateEb3(vn(), YEAR)).toEqual({ ok: true });
  });

  it("accepts a complete US answer", () => {
    expect(validateEb3(us(), YEAR)).toEqual({ ok: true });
  });

  it("accepts US with expired status (flagged later, not rejected)", () => {
    expect(validateEb3(us({ us_status: "expired" }), YEAR)).toEqual({ ok: true });
  });

  it("requires every base field on an empty form", () => {
    expect(errorsOf(emptyEb3Answers())).toEqual({
      full_name: "required",
      location: "required",
      birth_year: "required",
      english: "required",
      prior_us_visa_denial: "required",
      timeline: "required",
      ack_not_law_firm: "required",
    });
  });

  it("requires Facebook when in VN", () => {
    expect(errorsOf(vn({ facebook: "" }))).toEqual({ facebook: "required" });
  });

  it("treats whitespace-only values as missing", () => {
    expect(errorsOf(vn({ facebook: "   ", full_name: "  " }))).toEqual({
      facebook: "required",
      full_name: "required",
    });
  });

  it("does not require phone or visa status in VN", () => {
    expect(errorsOf(vn({ phone: "", us_status: "" }))).toEqual({});
  });

  it("requires phone and visa status in US, not Facebook", () => {
    expect(errorsOf(us({ phone: "", us_status: "", facebook: "" }))).toEqual({
      phone: "required",
      us_status: "required",
    });
  });

  it("rejects a US phone with fewer than 10 digits", () => {
    expect(errorsOf(us({ phone: "555-0123" }))).toEqual({ phone: "invalid" });
  });

  it("bounds birth year to 1940..currentYear-16", () => {
    expect(errorsOf(vn({ birth_year: "1940" }))).toEqual({});
    expect(errorsOf(vn({ birth_year: "2010" }))).toEqual({});
    expect(errorsOf(vn({ birth_year: "1939" }))).toEqual({ birth_year: "invalid" });
    expect(errorsOf(vn({ birth_year: "2011" }))).toEqual({ birth_year: "invalid" });
    expect(errorsOf(vn({ birth_year: "90" }))).toEqual({ birth_year: "invalid" });
    expect(errorsOf(vn({ birth_year: "19a0" }))).toEqual({ birth_year: "invalid" });
  });

  it("bounds children to integers 0..10", () => {
    expect(errorsOf(vn({ children_under_21: 10 }))).toEqual({});
    expect(errorsOf(vn({ children_under_21: 11 }))).toEqual({ children_under_21: "invalid" });
    expect(errorsOf(vn({ children_under_21: -1 }))).toEqual({ children_under_21: "invalid" });
    expect(errorsOf(vn({ children_under_21: 1.5 }))).toEqual({ children_under_21: "invalid" });
  });

  it("caps notes at 1000 characters", () => {
    expect(errorsOf(vn({ notes: "a".repeat(1000) }))).toEqual({});
    expect(errorsOf(vn({ notes: "a".repeat(1001) }))).toEqual({ notes: "invalid" });
  });

  it("requires the not-a-law-firm acknowledgement", () => {
    expect(errorsOf(vn({ ack_not_law_firm: false }))).toEqual({ ack_not_law_firm: "required" });
  });
});

describe("formatEb3Message", () => {
  it("formats a VN answer in fixed order without US-only lines", () => {
    expect(formatEb3Message(vn({ spouse: true, children_under_21: 2, notes: "  Làm nail 3 năm  " }))).toBe(
      [
        "[EB-3 Screening]",
        "Nơi ở: Việt Nam",
        "Năm sinh: 1990",
        "Tiếng Anh: Cơ bản",
        "Vợ/chồng đi cùng: Có",
        "Con dưới 21: 2",
        "Từng bị từ chối visa Mỹ: Không",
        "Thời điểm bắt đầu: Ngay",
        "Ghi chú: Làm nail 3 năm",
      ].join("\n"),
    );
  });

  it("includes visa status for US and the warning line when expired", () => {
    expect(formatEb3Message(us({ us_status: "expired", prior_us_visa_denial: true }))).toBe(
      [
        "[EB-3 Screening]",
        "Nơi ở: Mỹ",
        "Tình trạng visa: Đã hết hạn",
        "⚠️ Visa đã hết hạn — cần xem kỹ",
        "Năm sinh: 1985",
        "Tiếng Anh: Không biết",
        "Vợ/chồng đi cùng: Không",
        "Con dưới 21: 0",
        "Từng bị từ chối visa Mỹ: Có",
        "Thời điểm bắt đầu: 3–6 tháng",
      ].join("\n"),
    );
  });

  it("omits a stale US visa status when location is VN", () => {
    expect(formatEb3Message(vn({ us_status: "expired" }))).not.toContain("Tình trạng visa");
    expect(formatEb3Message(vn({ us_status: "expired" }))).not.toContain("⚠️");
  });
});

describe("buildEb3Payload", () => {
  it("builds a VN payload: trimmed Facebook + Zalo, no phone", () => {
    expect(buildEb3Payload(vn({ zalo: " 0901234567 ", phone: "3465550123" }))).toEqual({
      full_name: "Nguyễn Văn An",
      phone: "",
      facebook: "facebook.com/an.nguyen",
      zalo: "0901234567",
      service_type: "eb3",
      message: formatEb3Message(vn()),
    });
  });

  it("builds a US payload: phone kept, stale Zalo dropped", () => {
    const p = buildEb3Payload(us({ zalo: "0901234567", facebook: "" }));
    expect(p.phone).toBe("(346) 555-0123");
    expect(p.zalo).toBe("");
    expect(p.facebook).toBe("");
    expect(p.service_type).toBe("eb3");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/lib/services/eb3-screening.test.ts`
Expected: FAIL — `Failed to resolve import "./eb3-screening"`.

- [ ] **Step 3: Implement**

Create `apps/website/src/lib/services/eb3-screening.ts`:

```ts
// EB-3 Other Workers screening form: pure validation + the text block staff
// read in contact_submissions.message. No React, no fetch.

export type Eb3Location = "vn" | "us";
export type Eb3UsStatus = "b1b2" | "f1" | "other_valid" | "expired" | "unknown";
export type Eb3English = "none" | "basic" | "conversational";
export type Eb3Timeline = "now" | "3_6_months" | "researching";

export interface Eb3Answers {
  full_name: string;
  location: Eb3Location | "";
  facebook: string;
  zalo: string;
  phone: string;
  us_status: Eb3UsStatus | "";
  birth_year: string;
  english: Eb3English | "";
  spouse: boolean;
  children_under_21: number;
  prior_us_visa_denial: boolean | null;
  timeline: Eb3Timeline | "";
  notes: string;
  ack_not_law_firm: boolean;
}

export type Eb3Field = keyof Eb3Answers;
export type Eb3ErrorCode = "required" | "invalid";
export type Eb3Errors = Partial<Record<Eb3Field, Eb3ErrorCode>>;
export type Eb3Validation = { ok: true } | { ok: false; errors: Eb3Errors };

export interface Eb3ContactPayload {
  full_name: string;
  phone: string;
  facebook: string;
  zalo: string;
  service_type: "eb3";
  message: string;
}

export const EB3_NOTES_MAX = 1000;
export const EB3_CHILDREN_MAX = 10;
const MIN_BIRTH_YEAR = 1940;
const MIN_AGE = 16;
const MIN_US_PHONE_DIGITS = 10;

// Staff-facing labels (Vietnamese) — not user-facing copy, so they stay here
// rather than in messages/*.json.
const LOCATION_LABEL: Record<Eb3Location, string> = { vn: "Việt Nam", us: "Mỹ" };
const US_STATUS_LABEL: Record<Eb3UsStatus, string> = {
  b1b2: "Du lịch B1/B2",
  f1: "Du học F-1",
  other_valid: "Diện khác còn hạn",
  expired: "Đã hết hạn",
  unknown: "Không rõ",
};
const ENGLISH_LABEL: Record<Eb3English, string> = {
  none: "Không biết",
  basic: "Cơ bản",
  conversational: "Giao tiếp được",
};
const TIMELINE_LABEL: Record<Eb3Timeline, string> = {
  now: "Ngay",
  "3_6_months": "3–6 tháng",
  researching: "Đang tìm hiểu",
};

const isBlank = (s: string) => s.trim() === "";
const yesNo = (b: boolean) => (b ? "Có" : "Không");

export function emptyEb3Answers(): Eb3Answers {
  return {
    full_name: "",
    location: "",
    facebook: "",
    zalo: "",
    phone: "",
    us_status: "",
    birth_year: "",
    english: "",
    spouse: false,
    children_under_21: 0,
    prior_us_visa_denial: null,
    timeline: "",
    notes: "",
    ack_not_law_firm: false,
  };
}

export function validateEb3(a: Eb3Answers, currentYear = new Date().getFullYear()): Eb3Validation {
  const errors: Eb3Errors = {};

  if (isBlank(a.full_name)) errors.full_name = "required";
  if (a.location === "") errors.location = "required";

  if (a.location === "vn" && isBlank(a.facebook)) errors.facebook = "required";

  if (a.location === "us") {
    if (isBlank(a.phone)) errors.phone = "required";
    else if (a.phone.replace(/\D/g, "").length < MIN_US_PHONE_DIGITS) errors.phone = "invalid";
    if (a.us_status === "") errors.us_status = "required";
  }

  const year = a.birth_year.trim();
  if (year === "") errors.birth_year = "required";
  else if (!/^\d{4}$/.test(year) || Number(year) < MIN_BIRTH_YEAR || Number(year) > currentYear - MIN_AGE) {
    errors.birth_year = "invalid";
  }

  if (a.english === "") errors.english = "required";

  if (
    !Number.isInteger(a.children_under_21) ||
    a.children_under_21 < 0 ||
    a.children_under_21 > EB3_CHILDREN_MAX
  ) {
    errors.children_under_21 = "invalid";
  }

  if (a.prior_us_visa_denial === null) errors.prior_us_visa_denial = "required";
  if (a.timeline === "") errors.timeline = "required";
  if (a.notes.length > EB3_NOTES_MAX) errors.notes = "invalid";
  if (!a.ack_not_law_firm) errors.ack_not_law_firm = "required";

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}

// Assumes validateEb3 passed. Contact handles (Facebook/Zalo/phone) are NOT
// included — the API prepends Facebook/Zalo and phone has its own column.
export function formatEb3Message(a: Eb3Answers): string {
  const lines = ["[EB-3 Screening]"];
  if (a.location) lines.push(`Nơi ở: ${LOCATION_LABEL[a.location]}`);
  if (a.location === "us" && a.us_status) {
    lines.push(`Tình trạng visa: ${US_STATUS_LABEL[a.us_status]}`);
    if (a.us_status === "expired") lines.push("⚠️ Visa đã hết hạn — cần xem kỹ");
  }
  lines.push(`Năm sinh: ${a.birth_year.trim()}`);
  if (a.english) lines.push(`Tiếng Anh: ${ENGLISH_LABEL[a.english]}`);
  lines.push(`Vợ/chồng đi cùng: ${yesNo(a.spouse)}`);
  lines.push(`Con dưới 21: ${a.children_under_21}`);
  if (a.prior_us_visa_denial !== null) lines.push(`Từng bị từ chối visa Mỹ: ${yesNo(a.prior_us_visa_denial)}`);
  if (a.timeline) lines.push(`Thời điểm bắt đầu: ${TIMELINE_LABEL[a.timeline]}`);
  const notes = a.notes.trim();
  if (notes) lines.push(`Ghi chú: ${notes}`);
  return lines.join("\n");
}

// Location-scoped: fields belonging to the other location are dropped even if
// the visitor typed them before switching.
export function buildEb3Payload(a: Eb3Answers): Eb3ContactPayload {
  const inUs = a.location === "us";
  return {
    full_name: a.full_name.trim(),
    phone: inUs ? a.phone.trim() : "",
    facebook: a.facebook.trim(),
    zalo: inUs ? "" : a.zalo.trim(),
    service_type: "eb3",
    message: formatEb3Message(a),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/lib/services/eb3-screening.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/services/eb3-screening.ts apps/website/src/lib/services/eb3-screening.test.ts
git commit -m "feat(website): EB-3 screening validation and message formatting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `/api/contact` accepts Facebook/Zalo

**Files:**
- Modify: `apps/website/src/app/api/contact/route.ts` (destructure ~line 48–67, validation ~line 74–80, insert `message` ~line 97, email `Message` block ~line 132)
- Test: `apps/website/src/app/api/contact/route.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (the route stays generic).
- Produces: request body accepts optional `facebook: string`, `zalo: string`. Valid iff `full_name` and at least one non-blank of `email | phone | facebook | zalo`. 400 body: `{ error: "Name and a contact method are required." }`. Stored `message` = `["Facebook: <fb>", "Zalo: <zalo>", <message>]` (blank parts dropped) joined with `\n`, or `null` if all blank.

- [ ] **Step 1: Write the failing tests**

Create `apps/website/src/app/api/contact/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ insert }) }),
}));
vi.mock("@/lib/analytics/meta-capi", () => ({ sendCapiLead: vi.fn() }));

import { POST } from "./route";

let ipCounter = 0;
function post(body: Record<string, unknown>) {
  ipCounter += 1; // unique IP per request so the in-memory rate limiter never trips
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${ipCounter}` },
      body: JSON.stringify(body),
    }),
  );
}

function insertedRow() {
  expect(insert).toHaveBeenCalledTimes(1);
  return insert.mock.calls[0][0] as Record<string, unknown>;
}

beforeEach(() => {
  insert.mockReset();
  insert.mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("RESEND_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/contact", () => {
  it("accepts a Facebook-only lead and prepends the handle to the message", async () => {
    const res = await post({
      full_name: "Nguyễn Văn An",
      facebook: "  facebook.com/an.nguyen ",
      service_type: "eb3",
      message: "[EB-3 Screening]\nNơi ở: Việt Nam",
    });
    expect(res.status).toBe(200);
    const row = insertedRow();
    expect(row.service_type).toBe("eb3");
    expect(row.phone).toBeNull();
    expect(row.email).toBeNull();
    expect(row.message).toBe("Facebook: facebook.com/an.nguyen\n[EB-3 Screening]\nNơi ở: Việt Nam");
  });

  it("accepts a Zalo-only lead", async () => {
    const res = await post({ full_name: "An", zalo: "0901234567", message: "hi" });
    expect(res.status).toBe(200);
    expect(insertedRow().message).toBe("Zalo: 0901234567\nhi");
  });

  it("orders Facebook before Zalo before the message", async () => {
    await post({ full_name: "An", facebook: "fb", zalo: "zl", message: "m" });
    expect(insertedRow().message).toBe("Facebook: fb\nZalo: zl\nm");
  });

  it("leaves a legacy email lead's message untouched", async () => {
    const res = await post({ full_name: "Bob", email: "bob@example.com", service_type: "tax", message: "Hello" });
    expect(res.status).toBe(200);
    const row = insertedRow();
    expect(row.message).toBe("Hello");
    expect(row.email).toBe("bob@example.com");
  });

  it("stores null message when nothing was provided besides a phone", async () => {
    const res = await post({ full_name: "Bob", phone: "3465550123" });
    expect(res.status).toBe(200);
    expect(insertedRow().message).toBeNull();
  });

  it("rejects a lead with no contact method", async () => {
    const res = await post({ full_name: "An", message: "hi" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name and a contact method are required." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("treats whitespace-only Facebook/Zalo as missing", async () => {
    const res = await post({ full_name: "An", facebook: "   ", zalo: " " });
    expect(res.status).toBe(400);
  });

  it("ignores non-string Facebook/Zalo values", async () => {
    const res = await post({ full_name: "An", facebook: 123, zalo: { x: 1 } });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/app/api/contact/route.test.ts`
Expected: FAIL — Facebook/Zalo-only cases return 400 (current validation), message assertions fail. The legacy-email and no-contact cases may already pass (the latter with the old error string — it fails on the new string).

- [ ] **Step 3: Implement**

In `apps/website/src/app/api/contact/route.ts`:

(a) Add `facebook, zalo,` to the body destructure, right after `message,`:

```ts
    const {
      full_name,
      phone,
      email,
      service_type,
      message,
      facebook,
      zalo,
      locale = "en",
```

(b) Replace the `// Validation` block with:

```ts
    // Facebook/Zalo are free-text handles (EB-3 leads in Vietnam often have no
    // US phone or email). No dedicated columns — they're prepended to message.
    const facebookHandle = typeof facebook === "string" ? facebook.trim() : "";
    const zaloHandle = typeof zalo === "string" ? zalo.trim() : "";

    // Validation
    if (!full_name || (!email && !phone && !facebookHandle && !zaloHandle)) {
      return NextResponse.json(
        { error: "Name and a contact method are required." },
        { status: 400 }
      );
    }

    const fullMessage =
      [
        facebookHandle && `Facebook: ${facebookHandle}`,
        zaloHandle && `Zalo: ${zaloHandle}`,
        message,
      ]
        .filter(Boolean)
        .join("\n") || null;
```

(c) In the Supabase insert, replace `message: message || null,` with:

```ts
          message: fullMessage,
```

(d) In the Resend HTML, replace `<p>${escapeHtml(message || "N/A")}</p>` with:

```ts
            <p style="white-space:pre-line">${escapeHtml(fullMessage || "N/A")}</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/app/api/contact/route.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/api/contact/route.ts apps/website/src/app/api/contact/route.test.ts
git commit -m "feat(website): contact API accepts Facebook/Zalo as contact method

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: EB-3 copy (vi + en)

**Files:**
- Modify: `apps/website/src/messages/vi.json`, `apps/website/src/messages/en.json` (add a top-level `"eb3"` key as the last property)
- Test: `apps/website/src/messages/eb3-copy.test.ts`

**Interfaces:**
- Produces (used by Tasks 4–5): `Dictionary["eb3"]` with exactly the shape below. `Dictionary["eb3"]["form"]` is the form copy.

- [ ] **Step 1: Write the failing test**

Create `apps/website/src/messages/eb3-copy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import en from "./en.json";
import vi from "./vi.json";

// Shape = every key path plus array lengths; values ignored.
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return [`${path}[len=${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [path];
}

describe("eb3 copy", () => {
  it("exists in both locales", () => {
    expect((en as Record<string, unknown>).eb3).toBeDefined();
    expect((vi as Record<string, unknown>).eb3).toBeDefined();
  });

  it("has identical shape in vi and en", () => {
    const e = (en as Record<string, unknown>).eb3;
    const v = (vi as Record<string, unknown>).eb3;
    expect(shape(v).sort()).toEqual(shape(e).sort());
  });

  it("has no empty strings", () => {
    for (const locale of [en, vi]) {
      const flat = JSON.stringify((locale as Record<string, unknown>).eb3);
      expect(flat).not.toContain('""');
    }
  });

  it("never names the partner", () => {
    for (const locale of [en, vi]) {
      expect(JSON.stringify(locale).toLowerCase()).not.toContain("immilink");
    }
  });

  it("never uses the misleading 'lao động tự do' label", () => {
    expect(JSON.stringify(vi).toLowerCase()).not.toContain("lao động tự do");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/website && npx vitest run src/messages/eb3-copy.test.ts`
Expected: FAIL — "exists in both locales" (`eb3` undefined).

- [ ] **Step 3: Add the copy**

Add to `apps/website/src/messages/vi.json` (as the last top-level property; add a comma after the previous last property):

```json
  "eb3": {
    "meta_title": "Định cư Mỹ diện EB-3 lao động phổ thông | MannaOS",
    "meta_desc": "Tìm hiểu diện EB-3 lao động phổ thông (Other Workers): điều kiện, quy trình 5 bước, thời gian ước tính 4–6 năm. Kiểm tra điều kiện miễn phí cùng MannaOS.",
    "featured_badge": "Mới",
    "featured_title": "Định cư Mỹ diện EB-3 lao động phổ thông",
    "featured_desc": "Không cần bằng cấp. Dành cho người ở Việt Nam và người đang ở Mỹ muốn chuyển diện.",
    "featured_cta": "Tìm hiểu EB-3",
    "hero_eyebrow": "EB-3 Other Workers",
    "hero_title": "Định cư Mỹ diện EB-3 lao động phổ thông",
    "hero_sub": "Không cần bằng cấp, không cần tiếng Anh giỏi. Có chủ lao động Mỹ bảo lãnh, vợ/chồng và con dưới 21 tuổi được đi cùng.",
    "cta_messenger": "Nhắn Messenger tư vấn",
    "cta_check": "Kiểm tra điều kiện",
    "what_title": "EB-3 là gì?",
    "what_intro": "EB-3 là diện thẻ xanh dựa trên việc làm, gồm 3 nhánh:",
    "categories": [
      { "title": "Skilled Workers", "desc": "Công việc cần ít nhất 2 năm kinh nghiệm hoặc đào tạo." },
      { "title": "Professionals", "desc": "Công việc yêu cầu bằng cử nhân của Mỹ hoặc tương đương." },
      { "title": "Other Workers — lao động phổ thông", "desc": "Công việc cần dưới 2 năm kinh nghiệm. Không yêu cầu bằng cấp. Đây là diện MannaOS hỗ trợ." }
    ],
    "where_title": "Bạn đang ở đâu?",
    "where_vn_title": "Đang ở Việt Nam",
    "where_vn_desc": "Hồ sơ đi theo diện lãnh sự: nộp DS-260, khám sức khỏe và phỏng vấn tại Tổng Lãnh sự quán Mỹ ở TP.HCM.",
    "where_us_title": "Đang ở Mỹ",
    "where_us_desc": "Có thể chuyển diện (I-485) ngay tại Mỹ khi đến lượt. Điều kiện: bạn đang giữ tình trạng cư trú hợp pháp.",
    "steps_title": "Quy trình 5 bước",
    "steps": [
      { "title": "Đánh giá hồ sơ", "desc": "MannaOS xem thông tin của bạn và phản hồi trong 48 giờ." },
      { "title": "Ghép chủ lao động", "desc": "Kết nối với chủ lao động Mỹ đã được xác minh, phù hợp ngành nghề và tiểu bang." },
      { "title": "PERM + I-140", "desc": "Chủ lao động xin chứng nhận lao động (PERM), sau đó nộp đơn I-140 bảo lãnh bạn." },
      { "title": "Chờ lịch visa", "desc": "Chờ đến lượt theo Visa Bulletin, sau đó phỏng vấn lãnh sự (ở Việt Nam) hoặc nộp I-485 (ở Mỹ)." },
      { "title": "Nhận thẻ xanh", "desc": "Bạn và gia đình trở thành thường trú nhân Mỹ." }
    ],
    "steps_note": "Tổng thời gian ước tính khoảng 4–6 năm, tùy lịch visa và tốc độ xử lý của USCIS và Bộ Ngoại giao Mỹ. Thời gian không được bảo đảm.",
    "fit_title": "Ai phù hợp?",
    "fit_industries_title": "Ngành thường tuyển",
    "fit_industries": ["Chế biến thực phẩm", "Khách sạn, nhà hàng", "Chăm sóc người cao tuổi", "Nhà máy, sản xuất"],
    "fit_requirements_title": "Điều kiện cơ bản",
    "fit_requirements": ["Sức khỏe tốt", "Lý lịch tư pháp rõ ràng", "Cam kết làm việc cho chủ lao động bảo lãnh", "Chuẩn bị tài chính cho các mốc hồ sơ"],
    "cost_title": "Cấu trúc chi phí",
    "cost_intro": "Chi phí được chia theo từng mốc của hồ sơ. Gồm 4 nhóm:",
    "cost_items": [
      { "title": "Chủ lao động chi trả", "desc": "Chi phí xin chứng nhận lao động (PERM) và tuyển dụng do chủ lao động chịu theo quy định." },
      { "title": "Phí luật sư", "desc": "Phí luật sư di trú được cấp phép tại Mỹ thực hiện hồ sơ pháp lý." },
      { "title": "Phí chính phủ", "desc": "Lệ phí I-140, DS-260 hoặc I-485, khám sức khỏe." },
      { "title": "Phí dịch vụ MannaOS", "desc": "Điều phối hồ sơ, hỗ trợ tiếng Việt, dịch thuật và theo dõi tiến độ." }
    ],
    "cost_cta": "Nhắn Messenger để nhận báo giá",
    "faq_title": "Câu hỏi thường gặp",
    "faq": [
      { "q": "Tôi có cần biết tiếng Anh không?", "a": "Diện lao động phổ thông không yêu cầu tiếng Anh giỏi. Tiếng Anh cơ bản sẽ giúp bạn làm việc và phỏng vấn dễ dàng hơn." },
      { "q": "Gia đình có được đi cùng không?", "a": "Có. Vợ/chồng và con chưa kết hôn dưới 21 tuổi được đi cùng theo diện phụ thuộc." },
      { "q": "Visa Bulletin là gì?", "a": "Bảng lịch visa do Bộ Ngoại giao Mỹ công bố hằng tháng, cho biết hồ sơ nộp từ ngày nào đã đến lượt xét. Thời gian chờ phụ thuộc vào bảng này." },
      { "q": "Tôi đang ở Mỹ bằng visa du lịch, có chuyển diện được không?", "a": "Tùy trường hợp. Điều kiện quan trọng là bạn đang giữ tình trạng hợp pháp khi nộp I-485. Hãy gửi thông tin để được xem xét cụ thể." },
      { "q": "Tôi từng bị từ chối visa Mỹ, có nộp được không?", "a": "Vẫn có thể. Lý do bị từ chối trước đây sẽ được xem xét trong quá trình đánh giá hồ sơ." },
      { "q": "Tôi có phải làm việc cho chủ lao động bảo lãnh không?", "a": "Có. EB-3 dựa trên lời mời làm việc thật, bạn cần có ý định làm việc cho chủ lao động bảo lãnh sau khi nhận thẻ xanh." },
      { "q": "MannaOS có phải là văn phòng luật không?", "a": "Không. MannaOS là đơn vị hỗ trợ và điều phối hồ sơ. Hồ sơ pháp lý do luật sư di trú được cấp phép tại Mỹ đảm nhận." }
    ],
    "disclaimer": "MannaOS là đơn vị hỗ trợ và điều phối hồ sơ, không phải hãng luật và không cung cấp tư vấn pháp lý. Hồ sơ pháp lý do luật sư di trú được cấp phép tại Mỹ đảm nhận. Thời gian xử lý phụ thuộc USCIS và Bộ Ngoại giao Mỹ, không được bảo đảm.",
    "form": {
      "title": "Kiểm tra điều kiện miễn phí",
      "sub": "Trả lời vài câu hỏi ngắn, MannaOS sẽ liên hệ bạn trong 48 giờ.",
      "full_name": "Họ và tên",
      "location": "Bạn đang ở đâu?",
      "location_vn": "Việt Nam",
      "location_us": "Mỹ",
      "facebook": "Tên hoặc link Facebook",
      "facebook_hint": "Để MannaOS nhắn Messenger cho bạn",
      "zalo": "Số Zalo (không bắt buộc)",
      "phone": "Số điện thoại",
      "us_status": "Tình trạng visa hiện tại",
      "us_status_b1b2": "Du lịch B1/B2",
      "us_status_f1": "Du học F-1",
      "us_status_other_valid": "Diện khác, còn hạn",
      "us_status_expired": "Đã hết hạn",
      "us_status_unknown": "Không rõ",
      "birth_year": "Năm sinh",
      "english": "Mức tiếng Anh",
      "english_none": "Không biết",
      "english_basic": "Cơ bản",
      "english_conversational": "Giao tiếp được",
      "spouse": "Có vợ/chồng đi cùng",
      "children": "Số con dưới 21 tuổi",
      "denial": "Bạn đã từng bị từ chối visa Mỹ chưa?",
      "denial_yes": "Đã từng",
      "denial_no": "Chưa",
      "timeline": "Bạn định bắt đầu khi nào?",
      "timeline_now": "Ngay",
      "timeline_3_6_months": "Trong 3–6 tháng",
      "timeline_researching": "Đang tìm hiểu",
      "notes": "Ghi chú thêm (không bắt buộc)",
      "ack": "Tôi hiểu MannaOS là đơn vị hỗ trợ hồ sơ, không phải hãng luật và không cung cấp tư vấn pháp lý.",
      "select_placeholder": "Chọn...",
      "submit": "Gửi thông tin",
      "submitting": "Đang gửi...",
      "error_required": "Vui lòng điền mục này",
      "error_invalid": "Thông tin chưa hợp lệ",
      "error_submit": "Gửi chưa thành công. Vui lòng thử lại hoặc nhắn Messenger cho MannaOS.",
      "success_title": "Cảm ơn bạn!",
      "success_desc": "MannaOS sẽ liên hệ qua Messenger hoặc điện thoại trong 48 giờ.",
      "success_cta": "Nhắn Messenger ngay"
    }
  }
```

Add to `apps/website/src/messages/en.json` (same position):

```json
  "eb3": {
    "meta_title": "EB-3 Other Workers Green Card | MannaOS",
    "meta_desc": "Learn about the EB-3 Other Workers (unskilled) green card: eligibility, the 5-step process, and an estimated 4–6 year timeline. Free eligibility check with MannaOS.",
    "featured_badge": "New",
    "featured_title": "EB-3 Other Workers Green Card",
    "featured_desc": "No degree required. For people in Vietnam and people already in the U.S. seeking adjustment of status.",
    "featured_cta": "Learn about EB-3",
    "hero_eyebrow": "EB-3 Other Workers",
    "hero_title": "Get a U.S. Green Card through EB-3 Other Workers",
    "hero_sub": "No degree or fluent English required. A U.S. employer sponsors you, and your spouse and children under 21 can come too.",
    "cta_messenger": "Message us on Messenger",
    "cta_check": "Check eligibility",
    "what_title": "What is EB-3?",
    "what_intro": "EB-3 is an employment-based green card with 3 subcategories:",
    "categories": [
      { "title": "Skilled Workers", "desc": "Jobs requiring at least 2 years of experience or training." },
      { "title": "Professionals", "desc": "Jobs requiring a U.S. bachelor's degree or equivalent." },
      { "title": "Other Workers — unskilled", "desc": "Jobs requiring less than 2 years of experience. No degree required. This is the category MannaOS supports." }
    ],
    "where_title": "Where are you now?",
    "where_vn_title": "In Vietnam",
    "where_vn_desc": "Your case goes through consular processing: DS-260, medical exam, and an interview at the U.S. Consulate General in Ho Chi Minh City.",
    "where_us_title": "In the U.S.",
    "where_us_desc": "You may adjust status (I-485) inside the U.S. when your date is current. Requirement: you currently hold lawful status.",
    "steps_title": "The 5-step process",
    "steps": [
      { "title": "Case review", "desc": "MannaOS reviews your information and responds within 48 hours." },
      { "title": "Employer matching", "desc": "We connect you with a verified U.S. employer that fits your industry and state." },
      { "title": "PERM + I-140", "desc": "The employer obtains labor certification (PERM), then files an I-140 petition for you." },
      { "title": "Visa Bulletin wait", "desc": "Wait for your priority date to become current, then interview at the consulate (Vietnam) or file I-485 (U.S.)." },
      { "title": "Green card", "desc": "You and your family become U.S. permanent residents." }
    ],
    "steps_note": "Total time is an estimated 4–6 years, depending on the Visa Bulletin and USCIS and Department of State processing. Timelines are not guaranteed.",
    "fit_title": "Who is a good fit?",
    "fit_industries_title": "Common industries",
    "fit_industries": ["Food processing", "Hotels and restaurants", "Elder care", "Manufacturing"],
    "fit_requirements_title": "Basic requirements",
    "fit_requirements": ["Good health", "Clean criminal record", "Commitment to work for the sponsoring employer", "Financial readiness for each case milestone"],
    "cost_title": "Cost structure",
    "cost_intro": "Costs are split across the milestones of your case, in 4 groups:",
    "cost_items": [
      { "title": "Paid by the employer", "desc": "Labor certification (PERM) and recruitment costs are paid by the employer as required by law." },
      { "title": "Attorney fees", "desc": "Fees for the licensed U.S. immigration attorney who handles the legal filings." },
      { "title": "Government fees", "desc": "I-140, DS-260 or I-485 filing fees, and the medical exam." },
      { "title": "MannaOS service fee", "desc": "Case coordination, Vietnamese-language support, translation, and progress tracking." }
    ],
    "cost_cta": "Message us for a quote",
    "faq_title": "Frequently asked questions",
    "faq": [
      { "q": "Do I need to speak English?", "a": "The Other Workers category does not require fluent English. Basic English makes work and the interview easier." },
      { "q": "Can my family come with me?", "a": "Yes. Your spouse and unmarried children under 21 can come as derivative beneficiaries." },
      { "q": "What is the Visa Bulletin?", "a": "A monthly chart published by the U.S. Department of State showing which filing dates are current. Your wait time depends on it." },
      { "q": "I'm in the U.S. on a tourist visa. Can I adjust status?", "a": "It depends. The key requirement is holding lawful status when you file I-485. Send us your details for a specific review." },
      { "q": "I was refused a U.S. visa before. Can I still apply?", "a": "Possibly. The reason for the prior refusal will be reviewed during case evaluation." },
      { "q": "Do I have to work for the sponsoring employer?", "a": "Yes. EB-3 is based on a real job offer, and you must intend to work for the sponsoring employer after receiving your green card." },
      { "q": "Is MannaOS a law firm?", "a": "No. MannaOS provides case support and coordination. Legal filings are handled by licensed U.S. immigration attorneys." }
    ],
    "disclaimer": "MannaOS provides case support and coordination. MannaOS is not a law firm and does not provide legal advice. Legal filings are handled by licensed U.S. immigration attorneys. Processing times depend on USCIS and the U.S. Department of State and are not guaranteed.",
    "form": {
      "title": "Free eligibility check",
      "sub": "Answer a few short questions and MannaOS will contact you within 48 hours.",
      "full_name": "Full name",
      "location": "Where are you now?",
      "location_vn": "Vietnam",
      "location_us": "United States",
      "facebook": "Facebook name or profile link",
      "facebook_hint": "So MannaOS can message you on Messenger",
      "zalo": "Zalo number (optional)",
      "phone": "Phone number",
      "us_status": "Current visa status",
      "us_status_b1b2": "Tourist B1/B2",
      "us_status_f1": "Student F-1",
      "us_status_other_valid": "Other, still valid",
      "us_status_expired": "Expired",
      "us_status_unknown": "Not sure",
      "birth_year": "Year of birth",
      "english": "English level",
      "english_none": "None",
      "english_basic": "Basic",
      "english_conversational": "Conversational",
      "spouse": "Spouse coming with me",
      "children": "Children under 21",
      "denial": "Have you ever been refused a U.S. visa?",
      "denial_yes": "Yes",
      "denial_no": "No",
      "timeline": "When do you want to start?",
      "timeline_now": "Now",
      "timeline_3_6_months": "Within 3–6 months",
      "timeline_researching": "Just researching",
      "notes": "Anything else (optional)",
      "ack": "I understand MannaOS provides case support, is not a law firm, and does not provide legal advice.",
      "select_placeholder": "Select...",
      "submit": "Submit",
      "submitting": "Submitting...",
      "error_required": "This field is required",
      "error_invalid": "Please check this value",
      "error_submit": "Something went wrong. Please try again or message MannaOS on Messenger.",
      "success_title": "Thank you!",
      "success_desc": "MannaOS will contact you on Messenger or by phone within 48 hours.",
      "success_cta": "Message us now"
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/messages/eb3-copy.test.ts && npx tsc --noEmit`
Expected: PASS (5 tests); tsc exits 0 (JSON still parses and `Dictionary` still type-checks).

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/messages/vi.json apps/website/src/messages/en.json apps/website/src/messages/eb3-copy.test.ts
git commit -m "feat(website): EB-3 landing copy (vi/en)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: EB-3 page, screening form, Messenger button

**Files:**
- Create: `apps/website/src/components/services/Eb3MessengerButton.tsx`
- Create: `apps/website/src/components/services/Eb3ScreeningForm.tsx`
- Create: `apps/website/src/app/[locale]/services/immigration/eb3/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`emptyEb3Answers`, `validateEb3`, `buildEb3Payload`, `EB3_NOTES_MAX`, `EB3_CHILDREN_MAX`, types); Task 2 (`/api/contact` accepts `facebook`/`zalo`); Task 3 (`Dictionary["eb3"]`).
- Produces: route `/[locale]/services/immigration/eb3`; `<Eb3MessengerButton label />`; `<Eb3ScreeningForm copy locale />`; exported `EB3_MESSENGER_URL`.

This task is UI glue with its logic already tested in Tasks 1–3; verification is type-check, lint, build, and a manual browser pass.

- [ ] **Step 1: Messenger button**

Create `apps/website/src/components/services/Eb3MessengerButton.tsx`:

```tsx
"use client";

import { MessageCircle } from "lucide-react";
import { trackFbq, trackGa } from "@/lib/analytics/events";

export const EB3_MESSENGER_URL = "https://m.me/mannaonesolution?ref=eb3";

export default function Eb3MessengerButton({ label }: { label: string }) {
  const onClick = () => {
    trackFbq("Contact", { method: "messenger", service: "eb3" });
    trackGa("messenger_click", { service: "eb3" });
  };

  return (
    <a
      href={EB3_MESSENGER_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 text-sm font-semibold transition-colors bg-primary hover:bg-teal-dark text-white"
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
```

- [ ] **Step 2: Screening form**

Create `apps/website/src/components/services/Eb3ScreeningForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateEventId, trackFbq, trackGa } from "@/lib/analytics/events";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import {
  buildEb3Payload,
  EB3_CHILDREN_MAX,
  EB3_NOTES_MAX,
  emptyEb3Answers,
  validateEb3,
  type Eb3Answers,
  type Eb3ErrorCode,
  type Eb3Errors,
  type Eb3Field,
  type Eb3Location,
} from "@/lib/services/eb3-screening";
import Eb3MessengerButton from "./Eb3MessengerButton";

type FormCopy = Dictionary["eb3"]["form"];

const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const LABEL_CLASS = "block text-sm font-medium text-charcoal mb-1.5";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function Eb3ScreeningForm({ copy, locale }: { copy: FormCopy; locale: Locale }) {
  const [answers, setAnswers] = useState<Eb3Answers>(emptyEb3Answers);
  const [errors, setErrors] = useState<Eb3Errors>({});
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends Eb3Field>(field: K, value: Eb3Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Clear the other location's fields so stale values are never submitted.
  const setLocation = (location: Eb3Location) => {
    setAnswers((prev) =>
      location === "vn"
        ? { ...prev, location, phone: "", us_status: "" }
        : { ...prev, location, zalo: "" },
    );
    setErrors((prev) => ({ ...prev, location: undefined, phone: undefined, us_status: undefined, facebook: undefined }));
  };

  const errorText = (code: Eb3ErrorCode | undefined) =>
    code === "required" ? copy.error_required : code === "invalid" ? copy.error_invalid : null;

  const fieldError = (field: Eb3Field) => {
    const text = errorText(errors[field]);
    return text ? <p className="text-xs text-red-600 mt-1">{text}</p> : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(false);

    const result = validateEb3(answers);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const eventId = generateEventId();
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildEb3Payload(answers),
          email: "",
          locale,
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_content: params.get("utm_content") || "",
          utm_term: params.get("utm_term") || "",
          fbclid: params.get("fbclid") || "",
          gclid: params.get("gclid") || "",
          event_id: eventId,
          event_source_url: window.location.href,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          website: honeypot,
        }),
      });

      if (!res.ok) {
        setSubmitError(true);
        return;
      }
      trackFbq("Lead", { content_name: "eb3" }, eventId);
      trackGa("generate_lead", { service: "eb3", locale });
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <p className="text-charcoal font-semibold text-lg mb-1">{copy.success_title}</p>
        <p className="text-muted-foreground text-sm mb-6">{copy.success_desc}</p>
        <Eb3MessengerButton label={copy.success_cta} />
      </div>
    );
  }

  const inVn = answers.location === "vn";
  const inUs = answers.location === "us";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-name">{copy.full_name}</label>
        <Input id="eb3-name" value={answers.full_name} onChange={(e) => set("full_name", e.target.value)} className="rounded-lg" />
        {fieldError("full_name")}
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>{copy.location}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["vn", "us"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              aria-pressed={answers.location === loc}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                answers.location === loc ? "border-primary bg-teal-light text-charcoal" : "border-input text-muted-foreground hover:border-primary/50"
              }`}
            >
              {loc === "vn" ? `🇻🇳 ${copy.location_vn}` : `🇺🇸 ${copy.location_us}`}
            </button>
          ))}
        </div>
        {fieldError("location")}
      </fieldset>

      {inVn && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-fb">{copy.facebook}</label>
            <Input id="eb3-fb" value={answers.facebook} onChange={(e) => set("facebook", e.target.value)} className="rounded-lg" />
            <p className="text-xs text-muted-foreground mt-1">{copy.facebook_hint}</p>
            {fieldError("facebook")}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-zalo">{copy.zalo}</label>
            <Input id="eb3-zalo" inputMode="tel" value={answers.zalo} onChange={(e) => set("zalo", e.target.value)} className="rounded-lg" />
          </div>
        </div>
      )}

      {inUs && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="eb3-phone">{copy.phone}</label>
              <Input id="eb3-phone" type="tel" inputMode="tel" value={answers.phone} onChange={(e) => set("phone", e.target.value)} className="rounded-lg" />
              {fieldError("phone")}
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="eb3-fb-us">{copy.facebook}</label>
              <Input id="eb3-fb-us" value={answers.facebook} onChange={(e) => set("facebook", e.target.value)} className="rounded-lg" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-status">{copy.us_status}</label>
            <select
              id="eb3-status"
              value={answers.us_status}
              onChange={(e) => set("us_status", e.target.value as Eb3Answers["us_status"])}
              className={SELECT_CLASS}
            >
              <option value="">{copy.select_placeholder}</option>
              <option value="b1b2">{copy.us_status_b1b2}</option>
              <option value="f1">{copy.us_status_f1}</option>
              <option value="other_valid">{copy.us_status_other_valid}</option>
              <option value="expired">{copy.us_status_expired}</option>
              <option value="unknown">{copy.us_status_unknown}</option>
            </select>
            {fieldError("us_status")}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-year">{copy.birth_year}</label>
          <Input
            id="eb3-year"
            inputMode="numeric"
            maxLength={4}
            placeholder="1990"
            value={answers.birth_year}
            onChange={(e) => set("birth_year", e.target.value)}
            className="rounded-lg"
          />
          {fieldError("birth_year")}
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-english">{copy.english}</label>
          <select
            id="eb3-english"
            value={answers.english}
            onChange={(e) => set("english", e.target.value as Eb3Answers["english"])}
            className={SELECT_CLASS}
          >
            <option value="">{copy.select_placeholder}</option>
            <option value="none">{copy.english_none}</option>
            <option value="basic">{copy.english_basic}</option>
            <option value="conversational">{copy.english_conversational}</option>
          </select>
          {fieldError("english")}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <label className="flex items-center gap-2 text-sm text-charcoal h-9">
          <input type="checkbox" checked={answers.spouse} onChange={(e) => set("spouse", e.target.checked)} className="h-4 w-4 accent-primary" />
          {copy.spouse}
        </label>
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-children">{copy.children}</label>
          <select
            id="eb3-children"
            value={answers.children_under_21}
            onChange={(e) => set("children_under_21", Number(e.target.value))}
            className={SELECT_CLASS}
          >
            {Array.from({ length: EB3_CHILDREN_MAX + 1 }, (_, n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>{copy.denial}</legend>
        <div className="flex gap-6">
          {([true, false] as const).map((v) => (
            <label key={String(v)} className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="eb3-denial"
                checked={answers.prior_us_visa_denial === v}
                onChange={() => set("prior_us_visa_denial", v)}
                className="h-4 w-4 accent-primary"
              />
              {v ? copy.denial_yes : copy.denial_no}
            </label>
          ))}
        </div>
        {fieldError("prior_us_visa_denial")}
      </fieldset>

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-timeline">{copy.timeline}</label>
        <select
          id="eb3-timeline"
          value={answers.timeline}
          onChange={(e) => set("timeline", e.target.value as Eb3Answers["timeline"])}
          className={SELECT_CLASS}
        >
          <option value="">{copy.select_placeholder}</option>
          <option value="now">{copy.timeline_now}</option>
          <option value="3_6_months">{copy.timeline_3_6_months}</option>
          <option value="researching">{copy.timeline_researching}</option>
        </select>
        {fieldError("timeline")}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-notes">{copy.notes}</label>
        <Textarea
          id="eb3-notes"
          rows={3}
          maxLength={EB3_NOTES_MAX}
          value={answers.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="rounded-lg"
        />
        {fieldError("notes")}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={answers.ack_not_law_firm}
            onChange={(e) => set("ack_not_law_firm", e.target.checked)}
            className="h-4 w-4 mt-0.5 accent-primary shrink-0"
          />
          {copy.ack}
        </label>
        {fieldError("ack_not_law_firm")}
      </div>

      {submitError && <p className="text-sm text-red-600">{copy.error_submit}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-teal-dark text-white rounded-full gap-2"
        size="lg"
      >
        <Send className="h-4 w-4" />
        {loading ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Page**

Create `apps/website/src/app/[locale]/services/immigration/eb3/page.tsx`:

```tsx
import { CheckCircle, MapPin, Plane } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import Eb3MessengerButton from "@/components/services/Eb3MessengerButton";
import Eb3ScreeningForm from "@/components/services/Eb3ScreeningForm";

const PATH = "/services/immigration/eb3";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { eb3 } = await getDictionary(locale as Locale);
  return {
    title: eb3.meta_title,
    description: eb3.meta_desc,
    alternates: { languages: { en: `/en${PATH}`, vi: `/vi${PATH}` } },
  };
}

export default async function Eb3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { eb3 } = await getDictionary(locale as Locale);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: eb3.hero_title,
      description: eb3.meta_desc,
      serviceType: "EB-3 Other Workers immigration case support",
      provider: { "@type": "Organization", name: "MannaOS", url: "https://mannaos.com" },
      areaServed: [
        { "@type": "Country", name: "Vietnam" },
        { "@type": "Country", name: "United States" },
      ],
      url: `https://mannaos.com/${locale}${PATH}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: eb3.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="py-16 lg:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* 1. Hero */}
        <section>
          <span className="inline-block rounded-full bg-teal-light text-primary text-xs font-semibold px-3 py-1 mb-4">
            {eb3.hero_eyebrow}
          </span>
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">{eb3.hero_title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-8">{eb3.hero_sub}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Eb3MessengerButton label={eb3.cta_messenger} />
            <a
              href="#eb3-check"
              className="inline-flex items-center justify-center rounded-full px-6 h-11 text-sm font-semibold border border-primary text-primary hover:bg-teal-light transition-colors"
            >
              {eb3.cta_check}
            </a>
          </div>
        </section>

        {/* 2. What is EB-3 */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{eb3.what_title}</h2>
          <p className="text-muted-foreground mb-6">{eb3.what_intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {eb3.categories.map((c, i) => {
              const highlight = i === eb3.categories.length - 1;
              return (
                <div
                  key={c.title}
                  className={`p-5 rounded-xl border ${highlight ? "border-primary bg-teal-light/50" : "border-border"}`}
                >
                  <h3 className="font-semibold text-charcoal mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Where are you */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.where_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border">
              <Plane className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold text-charcoal mb-1">🇻🇳 {eb3.where_vn_title}</h3>
              <p className="text-sm text-muted-foreground">{eb3.where_vn_desc}</p>
            </div>
            <div className="p-5 rounded-xl border border-border">
              <MapPin className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold text-charcoal mb-1">🇺🇸 {eb3.where_us_title}</h3>
              <p className="text-sm text-muted-foreground">{eb3.where_us_desc}</p>
            </div>
          </div>
        </section>

        {/* 4. Steps */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.steps_title}</h2>
          <ol className="space-y-4">
            {eb3.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-charcoal">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground mt-6 p-4 rounded-lg bg-muted/50">{eb3.steps_note}</p>
        </section>

        {/* 5. Who fits */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.fit_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: eb3.fit_industries_title, items: eb3.fit_industries },
              { title: eb3.fit_requirements_title, items: eb3.fit_requirements },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-charcoal mb-3">{group.title}</h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-charcoal">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Cost structure */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{eb3.cost_title}</h2>
          <p className="text-muted-foreground mb-6">{eb3.cost_intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {eb3.cost_items.map((c) => (
              <div key={c.title} className="p-5 rounded-xl bg-teal-light/50 border border-border">
                <h3 className="font-semibold text-charcoal mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
          <Eb3MessengerButton label={eb3.cost_cta} />
        </section>

        {/* 7. Screening form */}
        <section id="eb3-check" className="scroll-mt-24 bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-charcoal mb-1">{eb3.form.title}</h2>
          <p className="text-muted-foreground text-sm mb-6">{eb3.form.sub}</p>
          <Eb3ScreeningForm copy={eb3.form} locale={locale as Locale} />
        </section>

        {/* 8. FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-charcoal mb-6">{eb3.faq_title}</h2>
          <div className="space-y-3">
            {eb3.faq.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border p-4">
                <summary className="cursor-pointer font-medium text-charcoal list-none flex justify-between gap-4">
                  {f.q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Disclaimer */}
        <p className="text-xs text-muted-foreground border-t border-border pt-6">{eb3.disclaimer}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check, lint, test, build**

Run:
```bash
cd apps/website && npx tsc --noEmit && npx eslint src/components/services src/app/\[locale\]/services/immigration/eb3 && npx vitest run && npx next build
```
Expected: all exit 0; build output lists `/[locale]/services/immigration/eb3`.

- [ ] **Step 5: Manual browser check**

Run `cd apps/website && npx next dev`, open `http://localhost:3000/vi/services/immigration/eb3` and `/en/...`:
- All 9 sections render, no `undefined` text, in both locales.
- Submit empty form → inline "Vui lòng điền mục này" on required fields; nothing sent (Network tab).
- Choose VN, type Zalo, switch to Mỹ → Zalo field gone; switch back → Zalo empty.
- Choose Mỹ with status "Đã hết hạn", fill all, submit → request body `service_type: "eb3"`, message contains `⚠️`; success screen shows Messenger button.
- Width 375px: no horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/components/services/Eb3MessengerButton.tsx apps/website/src/components/services/Eb3ScreeningForm.tsx "apps/website/src/app/[locale]/services/immigration/eb3/page.tsx"
git commit -m "feat(website): EB-3 landing page with screening form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Link the page — Immigration featured card + sitemap

**Files:**
- Modify: `apps/website/src/app/[locale]/services/immigration/page.tsx` (insert between the Header block and the "What We Offer" block)
- Modify: `apps/website/src/app/sitemap.ts` (after the `/services/immigration` line)

**Interfaces:**
- Consumes: `Dictionary["eb3"].featured_badge | featured_title | featured_desc | featured_cta` (Task 3); route from Task 4.

- [ ] **Step 1: Featured card**

In `apps/website/src/app/[locale]/services/immigration/page.tsx`, change the lucide import to:

```tsx
import { ArrowRight, Calendar, CheckCircle } from "lucide-react";
```

and insert after the closing `</div>` of `{/* Header */}`:

```tsx
        {/* Featured: EB-3 */}
        <Link
          href={`/${locale}/services/immigration/eb3`}
          className="group mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-primary bg-teal-light/60 p-6 transition-colors hover:bg-teal-light"
        >
          <div>
            <span className="inline-block rounded-full bg-primary text-white text-xs font-semibold px-2.5 py-0.5 mb-2">
              {d.eb3.featured_badge}
            </span>
            <h2 className="text-xl font-bold text-charcoal mb-1">{d.eb3.featured_title}</h2>
            <p className="text-sm text-muted-foreground">{d.eb3.featured_desc}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm shrink-0">
            {d.eb3.featured_cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
```

- [ ] **Step 2: Sitemap**

In `apps/website/src/app/sitemap.ts`, after `...urls("/services/immigration", 0.9, "monthly"),` add:

```ts
    ...urls("/services/immigration/eb3", 0.8, "monthly"),
```

- [ ] **Step 3: Verify**

Run: `cd apps/website && npx tsc --noEmit && npx next build`
Expected: exit 0. Then with `npx next dev`: `/vi/services/immigration` shows the card and clicking it opens the EB-3 page; `http://localhost:3000/sitemap.xml` contains `/vi/services/immigration/eb3` and `/en/services/immigration/eb3`.

- [ ] **Step 4: Commit**

```bash
git add "apps/website/src/app/[locale]/services/immigration/page.tsx" apps/website/src/app/sitemap.ts
git commit -m "feat(website): link EB-3 page from Immigration and sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin submissions preserve line breaks

**Files:**
- Modify: `apps/website/src/app/[locale]/admin/submissions/page.tsx:131`

- [ ] **Step 1: Edit**

Replace:

```tsx
                  {s.message && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{s.message}</p>}
```

with:

```tsx
                  {s.message && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-line">{s.message}</p>}
```

- [ ] **Step 2: Verify**

Run: `cd apps/website && npx tsc --noEmit`
Expected: exit 0. Manual: in `/vi/admin/submissions`, expand an EB-3 submission — each screening field on its own line.

- [ ] **Step 3: Commit**

```bash
git add "apps/website/src/app/[locale]/admin/submissions/page.tsx"
git commit -m "fix(website): admin submissions keep message line breaks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification + roadmap

**Files:**
- Modify: `docs/ROADMAP.md` (insert after line 49, the G4 v1 entry)

- [ ] **Step 1: Full verification**

Run:
```bash
cd apps/website && npx vitest run && npx tsc --noEmit && npx eslint && npx next build
grep -ri immilink src || echo "OK: no partner name"
grep -ri "lao động tự do" src || echo "OK: no misleading label"
```
Expected: tests pass, tsc/eslint/build exit 0, both greps print `OK: ...`.

- [ ] **Step 2: Roadmap entry**

Insert after the `Website Phase 3E — N400 Growth Engine G4 v1` line in `docs/ROADMAP.md`:

```markdown
- [x] **Website Phase 3F — EB-3 landing + screening** — Bilingual `/[locale]/services/immigration/eb3` landing for EB-3 Other Workers (Vietnam consular + U.S. adjustment of status): 9 sections (hero, categories, location paths, 5-step process, fit, cost structure without prices, screening form, FAQ + `FAQPage`/`Service` JSON-LD, not-a-law-firm disclaimer), tracked Messenger CTA (`m.me/mannaonesolution?ref=eb3`), location-driven screening form (`lib/services/eb3-screening.ts`) posting to `/api/contact` which now accepts Facebook/Zalo handles. Featured card on Immigration page + sitemap. No DB migration. Partner is white-label and never named on site. Run ahead of Phase 4 by owner decision. Spec: specs/2026-09-24-website-eb3-landing-design.md
```

(Mark `[x]` only after Step 1 passes.)

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: roadmap — Website Phase 3F EB-3 landing shipped

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Post-deploy manual check (Vercel preview)**

On the preview URL: submit one VN and one US lead → rows in `contact_submissions` with `service_type = 'eb3'`, staff email received with line breaks, `Lead` event visible in Meta Events Manager → Test Events. Then delete the two test rows.
