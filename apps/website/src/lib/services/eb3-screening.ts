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

// Top-to-bottom order of the fields on the form, so the UI can jump to the
// first error the visitor would see.
const EB3_FIELD_ORDER: Eb3Field[] = [
  "full_name",
  "location",
  "facebook",
  "zalo",
  "phone",
  "us_status",
  "birth_year",
  "english",
  "spouse",
  "children_under_21",
  "prior_us_visa_denial",
  "timeline",
  "notes",
  "ack_not_law_firm",
];

export function firstEb3ErrorField(errors: Eb3Errors): Eb3Field | null {
  return EB3_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

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
