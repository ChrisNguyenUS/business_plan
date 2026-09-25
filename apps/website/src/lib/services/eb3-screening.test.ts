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
