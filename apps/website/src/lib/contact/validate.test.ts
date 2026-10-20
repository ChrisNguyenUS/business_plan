import { describe, expect, it } from "vitest";
import { validateContact, CONTACT_SERVICES } from "./validate";

const ok = {
  full_name: "Nguyen Van A",
  phone: "",
  email: "a@example.com",
  service_type: "tax",
  message: "Need help filing",
};

describe("validateContact", () => {
  it("accepts a complete form with no phone (phone is optional)", () => {
    expect(validateContact(ok)).toEqual({});
  });

  it("flags every missing required field", () => {
    expect(validateContact({ full_name: " ", phone: "", email: "", service_type: "", message: "  " })).toEqual({
      full_name: "required",
      email: "required",
      service_type: "required",
      message: "required",
    });
  });

  it("rejects a malformed email", () => {
    expect(validateContact({ ...ok, email: "a@b" }).email).toBe("email");
    expect(validateContact({ ...ok, email: "a b@c.com" }).email).toBe("email");
  });

  it("accepts U.S. and international phone formats", () => {
    for (const phone of ["346-852-4454", "(346) 852-4454", "+1 346 852 4454", "+84 90 123 4567", "0901234567"]) {
      expect(validateContact({ ...ok, phone }).phone, phone).toBeUndefined();
    }
  });

  it("rejects phones that are too short, too long, or contain letters", () => {
    for (const phone of ["12345", "1234567890123456", "346-CALL-NOW"]) {
      expect(validateContact({ ...ok, phone }).phone, phone).toBe("phone");
    }
  });

  it("only accepts a known service value", () => {
    expect(validateContact({ ...ok, service_type: "crypto" }).service_type).toBe("required");
  });

  it("lists the six service categories plus Other, keeping the stored keys the admin filters on", () => {
    expect(CONTACT_SERVICES).toEqual(["immigration", "personal-documents", "tax", "business", "insurance", "ai", "general"]);
  });
});
