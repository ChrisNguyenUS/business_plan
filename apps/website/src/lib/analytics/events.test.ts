import { describe, it, expect } from "vitest";
import { normalizePhone } from "./events";

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
