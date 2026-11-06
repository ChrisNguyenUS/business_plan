import { describe, it, expect } from "vitest";
import { normalizePhone, vnPhoneToE164 } from "./events";

describe("normalizePhone", () => {
  it("defaults a bare US number to country code 1", () => {
    expect(normalizePhone("(512) 555-0100")).toBe("15125550100");
  });

  it("keeps a US number that already has the 1", () => {
    expect(normalizePhone("1-512-555-0100")).toBe("15125550100");
    expect(normalizePhone("+1 512 555 0100")).toBe("15125550100");
  });

  it("keeps an explicit international country code as-is", () => {
    expect(normalizePhone("+84 903 123 456")).toBe("84903123456");
    expect(normalizePhone("0084 903 123 456")).toBe("84903123456");
  });
});

describe("vnPhoneToE164", () => {
  it("adds the Vietnam country code to a number written with a leading 0", () => {
    expect(vnPhoneToE164("0912 345 678")).toBe("+84912345678");
    expect(vnPhoneToE164("0845.123.456")).toBe("+84845123456");
    expect(vnPhoneToE164("028 3823 4567")).toBe("+842838234567");
  });

  it("adds the country code to a national number typed without the 0", () => {
    expect(vnPhoneToE164("912345678")).toBe("+84912345678");
    expect(vnPhoneToE164("845123456")).toBe("+84845123456");
  });

  it("keeps a number that already has 84, +84 or 0084", () => {
    expect(vnPhoneToE164("84912345678")).toBe("+84912345678");
    expect(vnPhoneToE164("+84 912 345 678")).toBe("+84912345678");
    expect(vnPhoneToE164("(+84) 912-345-678")).toBe("+84912345678");
    expect(vnPhoneToE164("0084 912 345 678")).toBe("+84912345678");
  });

  it("keeps another explicit country code", () => {
    expect(vnPhoneToE164("+1 713 555 0100")).toBe("+17135550100");
  });

  it("returns null for a Zalo username or text that cannot be a phone number", () => {
    expect(vnPhoneToE164("an.nguyen")).toBeNull();
    expect(vnPhoneToE164("zalo.me/0912345678")).toBeNull();
    expect(vnPhoneToE164("12345")).toBeNull();
    expect(vnPhoneToE164("0912 345 678 999 1234")).toBeNull();
    expect(vnPhoneToE164("")).toBeNull();
  });
});
